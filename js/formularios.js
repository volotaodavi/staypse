// Formulários da lista de espera (afiliado, fornecedor e entregador):
// máscaras, validação com mensagem por campo e envio para a tabela
// "cadastros" do Supabase. Endereço e chave ficam em js/config.js.
(function () {
  var cfg = window.STAYPSE_CONFIG || {};
  var conectado = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);

  var UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
             'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

  // ---------------------------------------------------------------- máscaras
  function soDigitos(v) { return v.replace(/\D/g, ''); }
  function soCnpj(v) { return v.toUpperCase().replace(/[^0-9A-Z]/g, ''); }

  function mascaraTelefone(v) {
    var d = soDigitos(v).slice(0, 11);
    if (!d) return '';
    if (d.length <= 2) return '(' + d;
    var ddd = d.slice(0, 2), resto = d.slice(2);
    if (resto.length <= 4) return '(' + ddd + ') ' + resto;
    var corte = d.length === 11 ? 5 : 4;
    return '(' + ddd + ') ' + resto.slice(0, corte) + '-' + resto.slice(corte);
  }

  function mascaraCnpj(v) {
    var c = soCnpj(v).slice(0, 14);
    var s = c.slice(0, 2);
    if (c.length > 2) s += '.' + c.slice(2, 5);
    if (c.length > 5) s += '.' + c.slice(5, 8);
    if (c.length > 8) s += '/' + c.slice(8, 12);
    if (c.length > 12) s += '-' + c.slice(12, 14);
    return s;
  }

  var MASCARAS = { telefone: mascaraTelefone, cnpj: mascaraCnpj };

  // ------------------------------------------------------------- validações
  function whatsappValido(d) { return /^[1-9]{2}(9\d{8}|\d{8})$/.test(d); }
  function emailValido(v) { return v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  // Aceita o CNPJ numérico e o alfanumérico (formato novo da Receita Federal).
  function cnpjValido(c) {
    if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(c) || /^(.)\1{13}$/.test(c)) return false;
    function digito(base) {
      var soma = 0, peso = 2;
      for (var i = base.length - 1; i >= 0; i--) {
        soma += (base.charCodeAt(i) - 48) * peso;
        peso = peso === 9 ? 2 : peso + 1;
      }
      var resto = soma % 11;
      return resto < 2 ? 0 : 11 - resto;
    }
    var d1 = digito(c.slice(0, 12));
    var d2 = digito(c.slice(0, 12) + d1);
    return c.slice(12) === String(d1) + String(d2);
  }

  // Cada regra devolve '' quando está tudo certo, ou a mensagem de erro.
  var REGRAS = {
    'obrigatorio': function (v) { return v ? '' : 'Preencha este campo.'; },
    'nome': function (v) { return v.length >= 2 ? '' : 'Digite seu nome.'; },
    'nome-completo': function (v) {
      return v.split(/\s+/).filter(Boolean).length >= 2 ? '' : 'Digite nome e sobrenome.';
    },
    'whatsapp': function (v) {
      return whatsappValido(soDigitos(v)) ? '' : 'Digite o WhatsApp com DDD. Ex.: (11) 98765-4321';
    },
    'email': function (v) {
      return emailValido(v) ? '' : 'Digite um e-mail válido. Ex.: nome@email.com';
    },
    'cnpj': function (v) {
      if (!v) return 'Digite o CNPJ da empresa.';
      return cnpjValido(soCnpj(v)) ? '' : 'CNPJ inválido. Confira os números.';
    }
  };

  function validar(campo) {
    var regra = campo.dataset.validar;
    var msg;
    if (regra === 'grupo') {
      msg = campo.querySelector('input:checked') ? '' : (campo.dataset.mensagem || 'Escolha uma opção.');
    } else if (regra === 'aceite') {
      msg = campo.querySelector('input').checked ? '' : 'Para continuar, aceite a Política de Privacidade.';
    } else {
      var valor = campo.querySelector('input, select, textarea').value.trim();
      msg = (!valor && campo.dataset.mensagem) ? campo.dataset.mensagem : REGRAS[regra](valor);
    }
    mostrarErro(campo, msg);
    return !msg;
  }

  function mostrarErro(campo, msg) {
    campo.querySelector('.erro-campo').textContent = msg;
    campo.classList.toggle('com-erro', Boolean(msg));
    var alvo = campo.tagName === 'FIELDSET' ? campo : campo.querySelector('input, select, textarea');
    alvo.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }

  // ------------------------------------------------------------ coleta
  function coletar(form) {
    var dados = { tipo: form.dataset.tipo };
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.name === 'site') return;
      if (el.type === 'checkbox') {
        if (el.name === 'aceite_privacidade') dados.aceite_privacidade = el.checked;
        else if (el.checked) (dados[el.name] = dados[el.name] || []).push(el.value);
        return;
      }
      if (el.type === 'radio') {
        if (el.checked) dados[el.name] = el.value;
        return;
      }
      var valor = el.value.trim();
      if (valor) dados[el.name] = valor;
    });

    if (dados.whatsapp) dados.whatsapp = soDigitos(dados.whatsapp);
    if (dados.cnpj) dados.cnpj = soCnpj(dados.cnpj);
    if (dados.email) dados.email = dados.email.toLowerCase();
    ['vende_fisico', 'trabalha_afiliados'].forEach(function (chave) {
      if (chave in dados) dados[chave] = dados[chave] === 'sim';
    });

    var origem = window.Staypse ? window.Staypse.origem() : {};
    Object.keys(origem).forEach(function (chave) { dados[chave] = origem[chave]; });
    return dados;
  }

  // ------------------------------------------------------------ preparação
  document.querySelectorAll('select[data-uf]').forEach(function (select) {
    UFS.forEach(function (uf) { select.add(new Option(uf, uf)); });
  });

  document.querySelectorAll('[data-mascara]').forEach(function (input) {
    var mascara = MASCARAS[input.dataset.mascara];
    input.addEventListener('input', function () { input.value = mascara(input.value); });
  });

  document.querySelectorAll('form.formulario').forEach(function (form) {
    var campos = Array.prototype.slice.call(form.querySelectorAll('[data-validar]'));
    var mensagem = form.querySelector('.mensagem');
    var botao = form.querySelector('button[type="submit"]');

    // Cria o espaço da mensagem de erro de cada campo e liga ao leitor de tela.
    campos.forEach(function (campo, i) {
      var erro = document.createElement('p');
      erro.className = 'erro-campo';
      erro.id = form.dataset.tipo + '-erro-' + i;
      campo.appendChild(erro);
      var alvo = campo.tagName === 'FIELDSET' ? campo : campo.querySelector('input, select, textarea');
      var antes = alvo.getAttribute('aria-describedby');
      alvo.setAttribute('aria-describedby', (antes ? antes + ' ' : '') + erro.id);
    });

    // Depois do primeiro erro, o campo é conferido de novo enquanto a pessoa corrige.
    function revalidar(e) {
      var campo = e.target.closest('[data-validar]');
      if (campo && campo.classList.contains('com-erro')) validar(campo);
    }
    form.addEventListener('input', revalidar);
    form.addEventListener('change', revalidar);

    // Ao sair de um campo preenchido, confere na hora.
    form.addEventListener('focusout', function (e) {
      var campo = e.target.closest('[data-validar]');
      if (campo && campo.tagName !== 'FIELDSET' && e.target.value && e.target.value.trim()) validar(campo);
    });

    function avisar(texto, ehErro) {
      mensagem.textContent = texto;
      mensagem.classList.toggle('erro', Boolean(ehErro));
    }

    function sucesso() {
      form.reset();
      campos.forEach(function (campo) { mostrarErro(campo, ''); });
      avisar(form.dataset.sucesso);
      mensagem.scrollIntoView({ block: 'center' });
    }

    form.addEventListener('submit', function (evento) {
      evento.preventDefault();

      var invalidos = campos.filter(function (campo) { return !validar(campo); });
      if (invalidos.length) {
        avisar('Confira os campos destacados.', true);
        invalidos[0].querySelector('input, select, textarea').focus();
        return;
      }

      if (!conectado) {
        avisar('Formulário ainda não conectado: os dados não foram salvos.', true);
        console.warn('[Staypse] Preencha js/config.js com os dados do Supabase.');
        return;
      }

      // Campo invisível anti-robô: gente de verdade deixa vazio.
      if (form.querySelector('[name="site"]').value) { sucesso(); return; }

      botao.disabled = true;
      avisar('Enviando…');

      fetch(cfg.supabaseUrl.replace(/\/+$/, '') + '/rest/v1/cadastros', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': cfg.supabaseAnonKey,
          'Authorization': 'Bearer ' + cfg.supabaseAnonKey,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(coletar(form))
      })
        .then(function (resposta) {
          // 409 = já cadastrado. Para a pessoa, o resultado é o mesmo.
          if (resposta.ok || resposta.status === 409) return sucesso();
          return resposta.text().then(function (corpo) {
            throw new Error('HTTP ' + resposta.status + ' ' + corpo);
          });
        })
        .catch(function (erro) {
          console.error('[Staypse] Falha no envio:', erro);
          avisar('Não deu para enviar agora. Confira sua internet e tente de novo.', true);
        })
        .finally(function () { botao.disabled = false; });
    });
  });

  // Exposto só para os testes automáticos.
  window.StaypseValidacao = { cnpjValido: cnpjValido, mascaraCnpj: mascaraCnpj, mascaraTelefone: mascaraTelefone };
})();
