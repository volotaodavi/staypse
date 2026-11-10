// Medição: grava visitas e cliques na tabela "eventos" do Supabase.
// Sem cookies e sem dado pessoal: cada aba aberta recebe só um código aleatório.
// Para medir um botão ou link, basta colocar data-evento="nome_do_botao" nele.
(function () {
  var cfg = window.STAYPSE_CONFIG || {};
  var conectado = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);
  var CAMPOS_UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var memoria = {};

  function ler(chave) {
    try { return sessionStorage.getItem(chave); } catch (e) { return memoria[chave] || null; }
  }
  function gravar(chave, valor) {
    try { sessionStorage.setItem(chave, valor); } catch (e) { memoria[chave] = valor; }
  }

  function novoId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 15) | 64;
    b[8] = (b[8] & 63) | 128;
    var h = Array.prototype.map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }

  var sessao = ler('staypse_sessao');
  if (!sessao) { sessao = novoId(); gravar('staypse_sessao', sessao); }

  // Guarda as UTMs e o site de onde a pessoa veio, para valer na visita toda
  // (inclusive se ela abrir a página do entregador depois).
  (function guardarOrigem() {
    var params = new URLSearchParams(location.search);
    var utm = {}, achou = false;
    CAMPOS_UTM.forEach(function (campo) {
      var valor = params.get(campo);
      if (valor) { utm[campo] = valor.slice(0, 120); achou = true; }
    });
    if (achou) gravar('staypse_utm', JSON.stringify(utm));

    if (!ler('staypse_referencia') && document.referrer) {
      try {
        var site = new URL(document.referrer).hostname;
        if (site && site !== location.hostname) gravar('staypse_referencia', site.slice(0, 255));
      } catch (e) { /* referência inválida: ignora */ }
    }
  })();

  function origem() {
    var dados = {};
    try { dados = JSON.parse(ler('staypse_utm')) || {}; } catch (e) { dados = {}; }
    var referencia = ler('staypse_referencia');
    if (referencia) dados.referencia = referencia;
    dados.sessao = sessao;
    return dados;
  }

  var pagina = document.body.dataset.pagina || 'desconhecida';

  function registrar(evento, alvo) {
    if (!conectado) return;
    var corpo = origem();
    corpo.evento = evento;
    corpo.pagina = pagina;
    if (alvo) corpo.alvo = String(alvo).slice(0, 60);

    // keepalive: o envio termina mesmo se a pessoa mudar de página no clique.
    fetch(cfg.supabaseUrl.replace(/\/+$/, '') + '/rest/v1/eventos', {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        'apikey': cfg.supabaseAnonKey,
        'Authorization': 'Bearer ' + cfg.supabaseAnonKey,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(corpo)
    }).catch(function () { /* medição nunca pode atrapalhar a página */ });
  }

  registrar('visita');

  document.addEventListener('click', function (e) {
    var alvo = e.target.closest && e.target.closest('[data-evento]');
    if (alvo) registrar('clique', alvo.dataset.evento);
  }, true);

  window.Staypse = { origem: origem, registrar: registrar };
})();
