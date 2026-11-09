// Envio dos dois formulários (afiliado e fábrica) para o Supabase.
// Endereço e chave ficam em js/config.js. Cada <form> diz em data-tabela
// para qual tabela vai. Enquanto a configuração estiver vazia, o
// formulário NÃO salva nada e avisa isso na tela.

(function () {
  var cfg = window.STAYPSE_CONFIG || {};
  var conectado = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);

  document.querySelectorAll('form.formulario').forEach(function (form) {
    var mensagem = form.querySelector('.mensagem');
    var botao = form.querySelector('button[type="submit"]');

    function mostrar(texto, ehErro) {
      mensagem.textContent = texto;
      mensagem.classList.toggle('erro', !!ehErro);
    }

    function sucesso() {
      form.reset();
      mostrar(form.dataset.sucesso);
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

      if (!conectado) {
        mostrar('Formulário ainda não conectado: os dados não foram salvos.', true);
        console.warn('[Staypse] Preencha js/config.js com os dados do Supabase.');
        return;
      }

      var dados = {};
      new FormData(form).forEach(function (valor, nome) {
        dados[nome] = String(valor).trim();
      });

      // Campo invisível anti-robô: gente de verdade deixa vazio.
      if (dados.site) { sucesso(); return; }
      delete dados.site;

      if (!dados.whatsapp) delete dados.whatsapp;
      dados.email = dados.email.toLowerCase();

      botao.disabled = true;
      mostrar('Enviando…');

      fetch(cfg.supabaseUrl.replace(/\/+$/, '') + '/rest/v1/' + form.dataset.tabela, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': cfg.supabaseAnonKey,
          'Authorization': 'Bearer ' + cfg.supabaseAnonKey,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(dados)
      })
        .then(function (resposta) {
          // 409 = e-mail já cadastrado. Para a pessoa, o resultado é o mesmo.
          if (resposta.ok || resposta.status === 409) return sucesso();
          return resposta.text().then(function (corpo) {
            throw new Error('HTTP ' + resposta.status + ' ' + corpo);
          });
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
})();
