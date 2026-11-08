# Pixel Lab (antigo Pixel Fuga)

Siga o SECURITY.md em todo código deste projeto.

- `jogo/`: o jogo (site publicado em pixellabirinto.vercel.app; os endereços antigos pixelfuga, fuga-neon, pixellab8bit e pixellabgame redirecionam com o progresso, menos dentro do app Android). Código em `jogo/app.js`, cabeçalhos de segurança em `jogo/vercel.json`.
- `android/`: app Android (WebView) gerado por `android/build.sh`. A senha da chave de assinatura vem da variável `KS_PASS` e nunca entra no Git.
- `docs/`: apresentação e relatório de segurança.
