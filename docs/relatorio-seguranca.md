# Relatório de segurança: Pixel Lab, antigo Pixel Fuga (v2.4)

Auditoria feita em 7/11/2026 contra o padrão do `SECURITY.md` (Prompt Coringa: Segurança Máxima).

## 1. Tipo de sistema e seções aplicadas

**Jogo + app mobile** (site estático/PWA em pixellab8bit.vercel.app (antes pixelfuga.vercel.app) e app Android que abre o endereço antigo).

| Seção | Aplicada? | Por quê |
|---|---|---|
| Jogos | Sim | Corridas online e Desafio R$ 50 |
| Apps mobile | Sim | APK Android |
| Frontend | Sim | Site publicado |
| Segredos e infraestrutura | Sim | Chave de assinatura, Vercel, GitHub |
| LGPD, logs e incidentes | Sim (parcial) | Não há servidor próprio nem cadastro |
| Banco e API | Sim (desde a v2.2) | Ranking: tabelas `pixelfuga_*` e a função `pixelfuga-ranking` no Supabase |
| Autenticação, webhooks, pagamentos, uploads, IA | Não se aplica | O jogo não tem login, cobrança nem upload |

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
| Apelido e fases no ranking | Público (avisado na tela e na política) | Banco do ranking |
| Código do aparelho e IP | Pessoal (técnico) | Só como hash SHA-256; o IP serve só para o limite de envios |
| Crianças | Sensível | Classificação livre; dado pessoal só no ranking, que é opcional |

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

**Ranking (v2.2, revisto na v2.3)**
- v2.3: o Instagram saiu (coluna apagada do banco). Só o apelido aparece, e todo jogador com apelido entra no ranking. Menos dado pessoal guardado.
- Tabelas `pixelfuga_players` e `pixelfuga_rate` com RLS ligado e nenhuma política, e `revoke all` para `anon` e `authenticated`: ninguém lê nem grava direto. Só a função `pixelfuga-ranking` (chave de serviço, que fica no servidor) acessa.
- A função só devolve campos públicos (nunca o código do aparelho), aceita só as origens do jogo, limita o corpo a 2 KB, recusa campos desconhecidos e limita 60 envios a cada 10 minutos por IP (guardado como hash).
- Apelido passa pelo filtro de palavrões e links no jogo e de novo no servidor, e é sempre mostrado como texto.
- Plausibilidade: concluídas ≤ fase atual, desafio ≤ concluídas, tempo mínimo de 3 s por fase e no máximo 2 fases + 1 a cada 20 s desde o último envio. Ninguém desce de posição por um envio.
- Aviso no campo do apelido e na política de privacidade. Para sair, a pessoa pede pelo Instagram do criador (dá para apagar a linha no painel do Supabase).
- CSP `connect-src` liberando só o endereço do projeto.

**Cópia do progresso (v2.4)**
- Tabela `pixelfuga_saves` com as mesmas regras (RLS sem policies, `revoke all`). Só a função grava e lê.
- O código de recuperação é o código aleatório do aparelho (24 bytes, `crypto.getRandomValues`); no banco fica só o SHA-256. Tentar adivinhar é inviável e ainda cai no limite de 60 tentativas a cada 10 minutos por IP.
- A cópia aceita só chaves conhecidas e no máximo 6 KB. Ao recuperar, o jogo confere cada valor antes de juntar com o que já existe no aparelho.
- "Entrar com Google" ficou de fora: o login do Supabase do projeto "Fluxo zero" é o mesmo do seu CRM, e colocar jogadores lá poderia dar acesso a dados do CRM. Para ter Google, é preciso um Client ID do Google próprio do jogo, validado pela função (sem usar o login do CRM).

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
| Ranking pode ser inflado por quem forja os envios (a fase vem do aparelho) | Médio | Limites de salto e tempo já existem; remover linhas suspeitas pelo painel do Supabase; no futuro, a mesma validação em servidor do desafio |
| Desafio R$ 50 decidido no aparelho: quem entende de programação ainda consegue forjar a vitória | **Alto** | Servidor autoritativo (ex.: Supabase Edge Function) que gera a fase, recebe a partida (sequência de movimentos) e reproduz para conferir os 100% antes de liberar o prêmio |
| Quem cria a sala é o "servidor" da partida e pode trapacear na própria sala | Médio | Servidor de salas próprio decidindo as corridas |
| IP visível entre jogadores (conexão direta) | Médio | Servidor TURN próprio repassando o tráfego |
| Serviço de conexão público e gratuito, sem garantia de funcionamento | Médio | Servidor de conexão próprio (também resolve redes que hoje bloqueiam a sala) |
| Código de sala com 4 letras pode ser adivinhado | Baixo | Remover jogador já existe; dá para subir para 6 letras se virar problema |
| `style-src` com `unsafe-inline` (estilos embutidos) | Baixo | Mover estilos para arquivo; não permite rodar script |

## 7. Checklist de deploy

| Item | Situação |
|---|---|
| RLS em 100% das tabelas | ✅ `pixelfuga_*` com RLS e sem acesso público |
| Usuário A não lê dado do B | N/A: não há contas; cada progresso fica no próprio aparelho |
| 403 em rotas de admin | N/A: a função do ranking não tem rota de admin; origem errada recebe 403 |
| Nenhum segredo no frontend, no app ou no Git | ✅ (senha da chave removida do script; trocar a senha, item 5.1) |
| Pontuação e prêmios decididos no servidor | ⚠️ Corridas: checagem de tempo em quem cria a sala. Desafio: ainda no aparelho (risco alto, item 6) |
| Webhooks assinados | N/A |
| Rate limit | ✅ Na sala online e na função do ranking (60 por 10 min por IP) |
| MFA nas contas de infraestrutura | ⏳ Depende de você (item 5.2) |
| Cabeçalhos de segurança ativos | ✅ `jogo/vercel.json` |
| Uploads | N/A |
| Erros sem stack trace e logs sem dados | ✅ A função devolve mensagem genérica com um id e registra só a mensagem do erro |
| Backup | ⚠️ O plano grátis do Supabase não oferece backup para baixar. Se a tabela se perder, quem está no ranking reenvia a fase sozinho ao jogar; o código e o SQL estão no Git |
| npm audit | N/A no site (sem dependências instaladas); PeerJS 1.5.4 incluído como arquivo |
| Política de privacidade publicada | ✅ (fornecedores: item 5.5) |
| Alertas | N/A: não há servidor próprio |
| Preview protegido | ⏳ Depende de você (item 5.3) |
