# Pixel Fuga na Google Play — material e passo a passo

## Arquivos desta pasta

| Arquivo | Onde usar no Play Console |
|---|---|
| `icone-play-512.png` | Ícone do app (512×512, PNG 32 bits) |
| `destaque-1024x500.png` | Recurso gráfico (imagem de destaque) |
| `tela-1` a `tela-6` (1080×1920) | Capturas de tela do celular (mínimo 2) |

## Textos da ficha (sugestão)

**Nome:** Pixel Fuga

**Descrição curta (até 80 caracteres):**
Labirinto em pixel art: deslize, desvie dos perigos e fuja antes dos amigos.

**Descrição completa:**
Deslize o dedo e o bonequinho dispara até bater na parede. Ache a porta dourada no alto do labirinto antes que os perigos te peguem!

- 50 fases em 5 mundos: Porão, Esgoto, Caverna de Cristal, Fornalha e Torre de Gelo
- 7 perigos: espinhos, setas, portais, lasers, espinhos que sobem, esmagadores e a maré de plasma
- Jogue sozinho, a 2 no mesmo celular (tela dividida) ou numa sala online com até 6 amigos
- Salas com código de 4 letras: mande o convite no WhatsApp e jogue na hora
- Modo sozinho funciona sem internet
- Sem cadastro, sem anúncios

**Categoria:** Jogos › Quebra-cabeça (ou Arcade)

**Política de privacidade:** https://pixelfuga.vercel.app/politica-de-privacidade.html

## Passo a passo

1. **Conta no Play Console** (US$ 25, uma vez). Conta pessoal nova precisa de teste fechado com 12 testadores por 14 dias seguidos antes de liberar a produção; conta de organização (CNPJ + número D-U-N-S) não passa por isso. Decida antes: conta pessoal não vira conta de empresa depois.
2. **Gerar o pacote (AAB):** em https://www.pwabuilder.com, cole `https://pixelfuga.vercel.app`, escolha **Android** e baixe o pacote. Guarde a chave de assinatura e as senhas que ele gerar — sem elas não dá para publicar atualizações.
3. **Criar o app no Play Console**, enviar o AAB na trilha de teste (interno ou fechado) e preencher: ficha (textos e imagens acima), classificação de conteúdo (questionário IARC), segurança dos dados, público-alvo e anúncios (o jogo não tem anúncios).
4. **Tirar a barra de endereço do app:** o PWABuilder entrega um arquivo `assetlinks.json`. Ele precisa ficar em `jogo/.well-known/assetlinks.json`, com a impressão digital SHA-256 que aparece no Play Console em *Integridade do app › Assinatura de apps*. Sem isso o jogo abre com a barra do navegador no topo.
5. **Teste fechado → produção.** Com a conta pessoal: 12 testadores inscritos por 14 dias seguidos, depois pedir acesso à produção.

## Antes de enviar

- Teste a versão nova em dois celulares diferentes (um no Wi-Fi e outro no 4G) criando uma sala online.
- No questionário de classificação, informe que jogadores podem trocar texto entre si dentro da sala (apelido e texto da aposta).
