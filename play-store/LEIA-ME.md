# Pixel Fuga na Google Play — material e passo a passo

## Arquivos desta pasta

| Arquivo | Onde usar no Play Console |
|---|---|
| `icone-play-512.png` | Ícone do app (512×512, PNG 32 bits) |
| `destaque-1024x500.png` | Recurso gráfico (imagem de destaque) |
| `tela-1` a `tela-5` (1080×1920) | Capturas de tela do celular (mínimo 2) |

## Textos da ficha (sugestão)

**Nome:** Pixel Fuga

**Descrição curta (até 80 caracteres):**
Labirinto em pixel art: deslize, desvie dos perigos e fuja antes dos amigos.

**Descrição completa:**
Deslize o dedo e o bonequinho dispara até bater na parede. Ache a porta dourada no alto do labirinto antes que os perigos te peguem!

- 100 fases em 10 mundos: Porão, Esgoto, Caverna de Cristal, Fornalha, Torre de Gelo, Mansão Assombrada, Pântano, Fábrica, Laboratório e Tempestade
- 15 perigos: espinhos, setas, lasers, portais, espinhos que sobem, esmagadores, maré de plasma, bombas, fantasma caçador, vento assombrado, lama, cola, lança-chamas, poção da confusão e raios
- Pegue 80% dos pontinhos para abrir a porta de cada fase
- Novo modo Ultra Labirinto: labirinto gigante inteiro na tela, sozinho ou com amigos
- Desafio: quem zerar as 100 fases com pelo menos 90% dos pontinhos ganha R$ 50 (regras dentro do jogo)
- Jogue sozinho ou numa sala online com até 6 amigos, no modo Clássico ou no Ultra Labirinto
- Salas com código de 4 letras: mande o convite no WhatsApp e jogue na hora
- Modo sozinho funciona sem internet
- Sem cadastro, sem anúncios

**Categoria:** Jogos › Quebra-cabeça (ou Arcade)

**Política de privacidade:** https://pixellabirinto.vercel.app/politica-de-privacidade.html

## Passo a passo

1. **Conta no Play Console** (US$ 25, uma vez). Conta pessoal nova precisa de teste fechado com 12 testadores por 14 dias seguidos antes de liberar a produção; conta de organização (CNPJ + número D-U-N-S) não passa por isso. Decida antes: conta pessoal não vira conta de empresa depois.
2. **Gerar o pacote (AAB):** em https://www.pwabuilder.com, cole `https://pixellabirinto.vercel.app`, escolha **Android** e baixe o pacote. Guarde a chave de assinatura e as senhas que ele gerar — sem elas não dá para publicar atualizações.
3. **Criar o app no Play Console**, enviar o AAB na trilha de teste (interno ou fechado) e preencher: ficha (textos e imagens acima), classificação de conteúdo (questionário IARC), segurança dos dados, público-alvo e anúncios (o jogo não tem anúncios).
4. **Tirar a barra de endereço do app:** o PWABuilder entrega um arquivo `assetlinks.json`. Ele precisa ficar em `jogo/.well-known/assetlinks.json`, com a impressão digital SHA-256 que aparece no Play Console em *Integridade do app › Assinatura de apps*. Sem isso o jogo abre com a barra do navegador no topo.
5. **Teste fechado → produção.** Com a conta pessoal: 12 testadores inscritos por 14 dias seguidos, depois pedir acesso à produção.

## Antes de enviar

- Teste a versão nova em dois celulares diferentes (um no Wi-Fi e outro no 4G) criando uma sala online.
- No questionário de classificação, informe que jogadores podem trocar texto entre si dentro da sala (apelido e texto da aposta).

## Situação no site/app (7/11/2026)

Já está pronto em https://pixellabirinto.vercel.app:

- **Política de privacidade** publicada em `/politica-de-privacidade.html` (também tem link no menu do jogo).
- **Manifesto do app** (`/manifest.webmanifest`) com nome, cores, tela cheia, retrato, ícones 192/512, ícone "maskable" para o Android e 2 capturas de tela. É o que o PWABuilder lê no passo 2.
- **Funciona sem internet** depois da primeira visita (service worker em `/sw.js`), como diz a descrição da loja.
- **Dica de controle** no começo de cada partida: mãozinha transparente mostrando os 4 movimentos na parte de baixo da tela.

Falta (só dá para fazer depois de criar o app no Play Console):

- O arquivo `jogo/.well-known/assetlinks.json` do passo 4. Ele precisa da impressão digital SHA-256 que o Play Console mostra em *Integridade do app › Assinatura de apps*. Mande esse código que o arquivo é criado e publicado.

## Atenção: desafio com prêmio em dinheiro (versão 1.5)

A Google Play permite concursos com prêmio, mas exige que as **regras oficiais** fiquem visíveis (estão no menu do jogo, em "Regras do desafio") e que fique claro que **a Google não patrocina** o desafio (já está nas regras). Declare o desafio no questionário de conteúdo do Play Console. As capturas de tela desta pasta são da versão com 50 fases e ainda valem; o texto da ficha acima já fala em 100 fases e 15 perigos.
