// Envio dos dois formulários (afiliado e fábrica).
// Cada <form> tem data-endpoint: o endereço que vai receber os dados
// (planilha, ferramenta de e-mail ou backend). Enquanto estiver vazio,
// o formulário NÃO salva nada e avisa isso na tela.

document.querySelectorAll('form.formulario').forEach(function (form) {
  var mensagem = form.querySelector('.mensagem');
  var botao = form.querySelector('button[type="submit"]');

  function mostrar(texto, ehErro) {
    mensagem.textContent = texto;
    mensagem.classList.toggle('erro', !!ehErro);
  }

  form.addEventListener('submit', function (evento) {
    evento.preventDefault();

    // Validação: marca os campos obrigatórios vazios ou inválidos.
    var invalidos = Array.prototype.filter.call(form.elements, function (campo) {
      var ok = !campo.willValidate || campo.checkValidity();
      if (campo.willValidate) campo.setAttribute('aria-invalid', ok ? 'false' : 'true');
      return !ok;
    });
    if (invalidos.length) {
      mostrar('Confira os campos destacados.', true);
      invalidos[0].focus();
      return;
    }

    var endpoint = form.dataset.endpoint;
    if (!endpoint) {
      mostrar('Formulário ainda não conectado: os dados não foram salvos.', true);
      console.warn('[Staypse] Defina data-endpoint no formulário "' + form.dataset.tipo + '".');
      return;
    }

    var dados = Object.fromEntries(new FormData(form));
    dados.tipo = form.dataset.tipo;

    botao.disabled = true;
    mostrar('Enviando…');

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    })
      .then(function (resposta) {
        if (!resposta.ok) throw new Error('HTTP ' + resposta.status);
        form.reset();
        mostrar('Pronto, você está na lista. A gente avisa quando abrir.');
      })
      .catch(function (erro) {
        console.error('[Staypse] Falha no envio:', erro);
        mostrar('Não deu para enviar agora. Tente de novo em instantes.', true);
      })
      .finally(function () {
        botao.disabled = false;
      });
  });
});
