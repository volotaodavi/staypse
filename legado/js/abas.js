// Abas do formulário: "Sou afiliado" e "Tenho fábrica ou loja".
// Qualquer link com data-abrir-aba="afiliado" ou "fornecedor" abre a aba certa.
// Link direto para a aba de fornecedor: index.html#fornecedor
(function () {
  var abas = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  if (!abas.length) return;

  function selecionar(nome, focar) {
    abas.forEach(function (aba) {
      var ativa = aba.dataset.aba === nome;
      aba.setAttribute('aria-selected', String(ativa));
      aba.tabIndex = ativa ? 0 : -1;
      document.getElementById(aba.getAttribute('aria-controls')).hidden = !ativa;
      if (ativa && focar) aba.focus();
    });
  }

  abas.forEach(function (aba, i) {
    aba.addEventListener('click', function () { selecionar(aba.dataset.aba); });
    aba.addEventListener('keydown', function (e) {
      var passo = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!passo) return;
      e.preventDefault();
      selecionar(abas[(i + passo + abas.length) % abas.length].dataset.aba, true);
    });
  });

  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('[data-abrir-aba]');
    if (link) selecionar(link.dataset.abrirAba);
  });

  if (location.hash === '#fornecedor') {
    selecionar('fornecedor');
    document.getElementById('cadastro').scrollIntoView();
  } else {
    selecionar('afiliado');
  }
})();
