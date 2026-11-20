// botão voltar do app Android: volta para o jogo em vez de fechar
window.__fneonBack = () => { if (history.length > 1) history.back(); else location.href = '/'; return true; };
