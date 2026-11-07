# Relatório de segurança: Pixel Fuga (v1.8)

Auditoria feita em 7/11/2026 contra o padrão do `SECURITY.md` (Prompt Coringa: Segurança Máxima).

## 1. Tipo de sistema e seções aplicadas

**Jogo + app mobile** (site estático/PWA em pixelfuga.vercel.app e app Android que abre esse site).

| Seção | Aplicada? | Por quê |
|---|---|---|
| Jogos | Sim | Corridas online e Desafio R$ 50 |
| Apps mobile | Sim | APK Android |
| Frontend | Sim | Site publicado |
| Segredos e infraestrutura | Sim | Chave de assinatura, Vercel, GitHub |
| LGPD, logs e incidentes | Sim (parcial) | Não há servidor próprio nem cadastro |
| Autenticação, autorização, banco, API, webhooks, pagamentos, uploads, IA | Não se aplica | O jogo não tem login, banco, API própria, cobrança nem upload |

## 2. Modelo de ameaças (STRIDE)

- **Falsificação:** alguém adivinha o código de uma sala e entra. Bloqueio: quem criou a sala vê a lista e agora pode **remover** o jogador.
- **Adulteração:** um celular modificado diz que chegou na porta em 1 segundo, ou forja as 100 fases do desafio. Bloqueio: quem criou a sala recusa chegadas mais rápidas que o **caminho mais curto possível**. No desafio, há assinatura local e conferência manual (risco residual alto, ver item 5).
- **Repúdio:** sem servidor, não existe registro das partidas. Bloqueio: conferência manual do prêmio, com vídeo da tela.
- **Vazamento de informação:** o IP fica visível entre jogadores da mesma sala (conexão direta). Não se coleta dado pessoal. Isso está informado na política de privacidade.
- **Negação de serviço:** inundar a sala de mensagens. Bloqueio: no máximo 40 mensagens por segundo por jogador, e nome, aposta e voto no máximo a cada 0,8 s.
- **Elevação/injeção:** script escondido no nome ou na aposta. Bloqueio: texto sempre inserido como texto (nunca HTML), CSP que só aceita scripts do próprio site e filtro de links.

## 3. Classificação dos dados

| Dado | Classe | Onde fica |
|---|---|---|
| Apelido e texto da aposta | Público (para os jogadores da sala) | Memória da sala, some ao fechar |
| Progresso e resultados por fase | Interno | Só no aparelho (armazenamento local) |
| Endereço IP | Pessoal (técnico) | Visto pelos jogadores da sala e pelo serviço de conexão |
| Nome e chave Pix para o prêmio | Pessoal | Fora do app, na conversa de WhatsApp com o criador |
| Crianças | Sensível | O jogo tem classificação livre e não pede nenhum dado |

## 4. O que foi implementado (por seção)

**Frontend**
- Cabeçalhos de segurança em todas as páginas (`jogo/vercel.json`): CSP restritiva sem `unsafe-eval` e scripts só do próprio site, HSTS, `nosniff`, `X-Frame-Options: DENY` e `frame-ancestors 'none'`, `Referrer-Policy`, `Permissions-Policy` (câmera, microfone, localização e pagamento desligados) e `Cross-Origin-Opener-Policy`.
- Código do jogo tirado de dentro do HTML (`jogo/app.js`, `jogo/politica.js`), condição para a CSP rígida funcionar.
- Código fechado num escopo próprio: em produção, as funções internas (gravar fase, mostrar prêmio etc.) não ficam mais acessíveis pelo console do navegador.
- O último `innerHTML` (texto fixo da legenda) foi trocado por montagem segura de elementos.
- Links externos com `rel="noopener noreferrer"`.
- Logs de depuração da conexão desligados em produção.

**Jogos**
- Checagem de plausibilidade: quem cria a sala calcula o caminho mais curto de cada labirinto e recusa chegadas impossíveis, usando o próprio relógio.
- Limite de mensagens por jogador na sala.
- Filtro do texto que os outros veem (nome e aposta): tira links, @perfis e esconde palavrões.
- Botão **Remover** jogador para quem criou a sala.
- Mensagens recebidas validadas (tipo, tamanho e campos), como antes.

**Segredos**
- A senha da chave de assinatura foi tirada do `android/build.sh`. Agora ela só entra pela variável `KS_PASS` na hora de gerar o app.
- A chave (`.p12`) nunca foi para o Git (conferido no histórico) e continua bloqueada no `.gitignore`.

**Apps mobile**
- Nenhum segredo no APK. Permissões mínimas (internet, estado da rede e vibração). Só HTTPS. O app só navega no site do jogo (o resto abre fora dele). Ponte JavaScript exposta só para "fechar o app".

**Processo**
- `SECURITY.md` na raiz e `CLAUDE.md` mandando seguir o padrão em todo código novo.

## 5. O que depende de você

1. **Trocar a senha da chave de assinatura.** A senha antiga ficou registrada no histórico do Git, e apagar o commit não resolve. Mande o arquivo `fuga-neon.p12` numa próxima sessão para eu trocar a senha com você, testando que o app continua assinando igual (sem isso, as atualizações deixam de instalar por cima). Guarde a senha nova num gerenciador de senhas.
2. **Ativar MFA (verificação em duas etapas)** no GitHub, na Vercel, na conta Google do Play Console e no Instagram/WhatsApp usados no prêmio.
3. **Vercel:** ativar a proteção dos deploys de preview (Deployment Protection) e conhecer o "Attack Challenge Mode" do Firewall para usar em caso de ataque.
4. **Desafio R$ 50:** só pagar depois de vídeo da tela jogando as últimas fases, até existir validação em servidor.
5. **Política de privacidade (LGPD):** o padrão pede a lista de fornecedores que tocam nos dados. A seção foi removida a seu pedido e ficou uma menção genérica ao "serviço de conexão". Decida se volta a listar.

## 6. Riscos que sobraram e como reduzir

| Risco | Nível | Como reduzir |
|---|---|---|
| Desafio R$ 50 decidido no aparelho: quem entende de programação ainda consegue forjar a vitória | **Alto** | Servidor autoritativo (ex.: Supabase Edge Function) que gera a fase, recebe a partida (sequência de movimentos) e reproduz para conferir os 100% antes de liberar o prêmio |
| Quem cria a sala é o "servidor" da partida e pode trapacear na própria sala | Médio | Servidor de salas próprio decidindo as corridas |
| IP visível entre jogadores (conexão direta) | Médio | Servidor TURN próprio repassando o tráfego |
| Serviço de conexão público e gratuito, sem garantia de funcionamento | Médio | Servidor de conexão próprio (também resolve redes que hoje bloqueiam a sala) |
| Código de sala com 4 letras pode ser adivinhado | Baixo | Remover jogador já existe; dá para subir para 6 letras se virar problema |
| `style-src` com `unsafe-inline` (estilos embutidos) | Baixo | Mover estilos para arquivo; não permite rodar script |

## 7. Checklist de deploy

| Item | Situação |
|---|---|
| RLS em 100% das tabelas | N/A: não há banco |
| Usuário A não lê dado do B | N/A: não há contas; cada progresso fica no próprio aparelho |
| 403 em rotas de admin | N/A: não há rotas de servidor |
| Nenhum segredo no frontend, no app ou no Git | ✅ (senha da chave removida do script; trocar a senha, item 5.1) |
| Pontuação e prêmios decididos no servidor | ⚠️ Corridas: checagem de tempo em quem cria a sala. Desafio: ainda no aparelho (risco alto, item 6) |
| Webhooks assinados | N/A |
| Rate limit | ✅ Na sala online (não há login nem API) |
| MFA nas contas de infraestrutura | ⏳ Depende de você (item 5.2) |
| Cabeçalhos de segurança ativos | ✅ `jogo/vercel.json` |
| Uploads | N/A |
| Erros sem stack trace e logs sem dados | ✅ Sem logs de depuração em produção |
| Backup | N/A: não há banco; o código está no Git |
| npm audit | N/A no site (sem dependências instaladas); PeerJS 1.5.4 incluído como arquivo |
| Política de privacidade publicada | ✅ (fornecedores: item 5.5) |
| Alertas | N/A: não há servidor próprio |
| Preview protegido | ⏳ Depende de você (item 5.3) |
