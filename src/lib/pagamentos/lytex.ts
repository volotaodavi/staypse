// Provedor Lytex, escrito SÓ com o que existe no OpenAPI oficial
// docs/lytex/openapi-v2-sandbox.json (baixado de .../v2/open-api-v3-spec.json).
// REGRA DO DONO: proibido inventar endpoint, campo ou formato; sempre sandbox até autorização.
// Cada chamada cita o operationId/path do spec. O que o spec não responde vira
// TODO + pergunta em docs/lytex/PERGUNTAS.md (seção "Respostas do spec").
//
// Sem `import "server-only"` de propósito: o arquivo precisa rodar nos testes unitários (tsx).
// Ele só é importado por ./index.ts, que é server-only, então não vai para o navegador.
import { IntegracaoPendente } from "./tipos";
import type {
  Cobranca,
  DadosCobranca,
  DadosPagamento,
  DadosRecebedor,
  EventoPagamento,
  PaymentProvider,
  RecebedorNoProvedor,
  StatusCobranca,
  StatusRecebedor,
} from "./tipos";

// Sandbox por padrão; produção só se o dono configurar LYTEX_API_URL (servers[] do spec).
export const URL_SANDBOX = "https://sandbox-api-pay.lytex.com.br";

// A interface PaymentProvider (tipos.ts) ainda não carrega estes dados, mas a Lytex EXIGE:
//  * subconta: celular e endereço (POST /v2/sub-accounts → required: type,name,cellphone,email,address)
//  * fatura: cliente com type, name e cpfCnpj (POST /v2/invoices → required: _clientId OU client)
// Quem chama deve preenchê-los; sem eles o provedor recusa em vez de inventar valores.
export type EnderecoLytex = { rua: string; bairro: string; cidade: string; uf: string; cep: string; numero?: string; complemento?: string };
export type DadosRecebedorLytex = DadosRecebedor & {
  celular?: string; // 10 ou 11 dígitos
  endereco?: EnderecoLytex;
  nomeFantasia?: string; // exigido para pj (fantasyName)
  tipoEmpresa?: "mei" | "others" | "ei" | "eireli" | "slu" | "ltda" | "ss" | "sa"; // companyType, exigido para pj
};
export type CompradorLytex = { nome: string; documento: string; email?: string };
export type DadosCobrancaLytex = DadosCobranca & { comprador?: CompradorLytex };

// Vencimento da fatura (dueDate é obrigatório). TODO(lytex): confirmar prazo ideal de Pix/boleto (PERGUNTAS 34).
export const DIAS_VENCIMENTO = 3;

type Opcoes = {
  fetch?: typeof fetch;
  env?: Record<string, string | undefined>;
  agora?: () => number; // ms; injetável nos testes
};

type Token = { accessToken: string; refreshToken: string; expiraEm: number; refreshExpiraEm: number };

// ---------------------------------------------------------------------------------------------
// Mapas de status (só valores que o spec define)
// ---------------------------------------------------------------------------------------------

// Subconta. Campos do spec: GET /v2/sub-accounts/{id} e GET /v2/sub-accounts →
//  status (conta): active | blocked | disabled | pending_exclusion
//  documentStatus: pending | waiting_approval | approved | rejected | approved_system | processing |
//                  waiting_approve_qsa | full_rejected | resend
//  walletAccountStatus: waiting_approval | approved | rejected
// O spec NÃO descreve o significado de cada valor (PERGUNTAS 41); o mapa abaixo é a leitura literal dos nomes:
//  conta blocked/disabled/pending_exclusion             → suspenso
//  documentStatus rejected/full_rejected OU wallet rejected → recusado
//  documentStatus approved/approved_system (wallet ≠ waiting_approval) → aprovado
//  documentStatus waiting_approval/processing/waiting_approve_qsa (ou wallet waiting_approval) → em_analise
//  documentStatus pending/resend/ausente                → nao_iniciado (pessoa precisa enviar/reenviar documentos)
//  valor desconhecido → em_analise (nunca aprova por engano)
export function mapearStatusRecebedor(s: { status?: string; documentStatus?: string; walletAccountStatus?: string }): {
  status: StatusRecebedor;
  motivo: string | null;
} {
  if (s.status === "blocked" || s.status === "disabled" || s.status === "pending_exclusion") return { status: "suspenso", motivo: `conta_${s.status}` };
  if (s.documentStatus === "rejected" || s.documentStatus === "full_rejected") return { status: "recusado", motivo: `documentos_${s.documentStatus}` };
  if (s.walletAccountStatus === "rejected") return { status: "recusado", motivo: "carteira_rejected" };
  switch (s.documentStatus) {
    case "approved":
    case "approved_system":
      return s.walletAccountStatus === "waiting_approval" ? { status: "em_analise", motivo: null } : { status: "aprovado", motivo: null };
    case "waiting_approval":
    case "processing":
    case "waiting_approve_qsa":
      return { status: "em_analise", motivo: null };
    case "pending":
    case undefined:
      return { status: "nao_iniciado", motivo: null };
    case "resend":
      return { status: "nao_iniciado", motivo: "reenviar_documentos" };
    default:
      return { status: "em_analise", motivo: null };
  }
}

// Fatura. O spec só enumera o status da TRANSAÇÃO (GET /v2/invoices/{id} → transactions[].status,
// GET /v2/transactions): paid | recused | refund | canceled | chargeback | processing | waitingPayment | overdue | error.
// O campo `status` da própria fatura é "string" sem enum; assumimos o mesmo vocabulário (PERGUNTAS 42) e
// quando ele vier fora do conjunto usamos a transação mais recente.
//  paid → paga · refund → estornada · chargeback → chargeback · recused/error → recusada · canceled → expirada
//  waitingPayment/processing/overdue → pendente (a fatura segue pagável até cancelOverdueDays; enviamos 1)
const STATUS_FATURA: Record<string, StatusCobranca> = {
  paid: "paga",
  refund: "estornada",
  chargeback: "chargeback",
  recused: "recusada",
  error: "recusada",
  canceled: "expirada",
  waitingPayment: "pendente",
  processing: "pendente",
  overdue: "pendente",
};

type Solicitacao = { acceptedAt?: unknown; refusedAt?: unknown; canceledAt?: unknown };
type FaturaLytex = {
  _id?: string;
  status?: string;
  linkCheckout?: string;
  linkBoleto?: string;
  dueDate?: string;
  paymentMethods?: {
    pix?: { qrcode?: string };
    boleto?: { digitableLine?: string; qrCode?: { emv?: string } };
  };
  transactions?: { status?: string }[];
  refundSolicitations?: Solicitacao[];
  totalValue?: number; // GET /v2/invoices/{id}: valor da fatura
  paymentData?: { payedValue?: number }; // valor efetivamente pago (quando paga)
};

// Valor da fatura em centavos (o que conferimos antes de confirmar). Paga: o valor pago (paymentData.payedValue);
// senão o total da fatura. A unidade não é dita no spec (assumida centavos, como o `value` que enviamos: PERGUNTAS 43).
// O spec NÃO tem campo de moeda: a Lytex só opera em reais, então a moeda é BRL (PERGUNTAS 54).
export function valorDaFatura(f: FaturaLytex, status: StatusCobranca): number | null {
  const v = status === "paga" || status === "estorno_pendente" ? (f.paymentData?.payedValue ?? f.totalValue) : f.totalValue;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
const MOEDA_LYTEX = "BRL";

// Pix e boleto que a fatura devolve (InvoicesController_createInvoice_v2, resposta 201:
// paymentMethods.pix.qrcode "copia e cola", paymentMethods.boleto.digitableLine, linkBoleto, dueDate)
export function pagamentoDaFatura(f: FaturaLytex): DadosPagamento | null {
  const pix = f.paymentMethods?.pix?.qrcode || f.paymentMethods?.boleto?.qrCode?.emv || null;
  const linha = f.paymentMethods?.boleto?.digitableLine || null;
  const boletoUrl = f.linkBoleto || null;
  if (!pix && !linha && !boletoUrl) return null;
  return { pixCopiaECola: pix, boletoLinhaDigitavel: linha, boletoUrl, venceEm: f.dueDate ? String(f.dueDate).slice(0, 10) : null };
}

export function mapearStatusFatura(f: FaturaLytex): StatusCobranca {
  let status = f.status ? STATUS_FATURA[f.status] : undefined;
  if (!status && f.transactions?.length) {
    const ultima = f.transactions[f.transactions.length - 1]?.status;
    status = ultima ? STATUS_FATURA[ultima] : undefined;
  }
  status ??= "pendente";
  // paga + solicitação de estorno ainda sem aceite/recusa/cancelamento (campos de RefundSolicitation) → estorno_pendente
  if (status === "paga" && f.refundSolicitations?.some((r) => !r.acceptedAt && !r.refusedAt && !r.canceledAt)) return "estorno_pendente";
  return status;
}

// ---------------------------------------------------------------------------------------------
// Cliente HTTP
// ---------------------------------------------------------------------------------------------

// Conta PRÓPRIA da Staypse na Lytex (a conta principal das credenciais LYTEX_CLIENT_*), só para o admin.
// Os valores vêm do spec como `number` sem dizer a unidade; tratamos como CENTAVOS (o `amount` do saque é
// integer) e a pergunta está em docs/lytex/PERGUNTAS.md.
export type CarteiraLytex = { saldoCentavos: number; saldoFuturoCentavos: number; saqueMinimoCentavos: number; taxaAtual: number };
export type ResumoCarteiraLytex = { entradasCentavos: number; saidasCentavos: number; taxasCentavos: number };
export type ContaBancariaLytex = { id: string; banco: string; agencia: string; conta: string; titular: string };
export type SaqueLytex = { id: string; valorCentavos: number; taxasCentavos: number; status: string };

// Subconta de um usuário (loja, afiliado ou vendedor): o dinheiro dele fica na subconta, nunca na Staypse.
// O spec NÃO traz saldo por subconta (GET /v2/wallet não aceita o cabeçalho subRecipientId): ver PERGUNTAS 58.
export type ContaBancariaSubconta = { id: string; banco: string; agenciaFinal: string; contaFinal: string };
export type SaqueSubconta = { id: string; taxasCentavos: number; status: string };
export type ContaSubconta = {
  contasBancarias(subId: string): Promise<ContaBancariaSubconta[]>;
  solicitarSaque(subId: string, valorCentavos: number, contaBancariaId: string): Promise<SaqueSubconta>;
};

export type ContaLytex = {
  carteira(): Promise<CarteiraLytex>;
  resumoCarteira(): Promise<ResumoCarteiraLytex>;
  contasBancarias(): Promise<ContaBancariaLytex[]>;
  solicitarSaque(valorCentavos: number, contaBancariaId: string): Promise<SaqueLytex>;
};

// mesmo contrato do PaymentProvider, aceitando também os dados extras que a Lytex exige
export type ProvedorLytex = Omit<PaymentProvider, "criarRecebedor" | "criarCobranca"> & {
  criarRecebedor(dados: DadosRecebedorLytex): Promise<RecebedorNoProvedor>;
  criarCobranca(dados: DadosCobrancaLytex): Promise<Cobranca>;
  conta: ContaLytex;
  subconta: ContaSubconta;
};

export function criarLytex(opcoes: Opcoes = {}): ProvedorLytex {
  const env = () => opcoes.env ?? process.env;
  const doFetch: typeof fetch = (...a) => (opcoes.fetch ?? globalThis.fetch)(...a);
  const agora = () => (opcoes.agora ?? Date.now)();
  const base = () => (env().LYTEX_API_URL?.trim() || URL_SANDBOX).replace(/\/+$/, "");

  let token: Token | null = null;
  let emVoo: Promise<Token> | null = null;

  async function chamar(metodo: string, caminho: string, corpo?: unknown, bearer?: string, extra?: Record<string, string>): Promise<unknown> {
    const res = await doFetch(`${base()}${caminho}`, {
      method: metodo,
      headers: { "content-type": "application/json", ...(bearer ? { authorization: `Bearer ${bearer}` } : {}), ...extra },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    const texto = await res.text();
    let json: unknown = null;
    try {
      json = texto ? JSON.parse(texto) : null;
    } catch {
      json = null;
    }
    if (!res.ok) {
      // mensagem do spec (message) sem nunca ecoar o corpo enviado (pode ter segredos/dados pessoais)
      const j = json as { message?: unknown } | null;
      const msg = typeof j?.message === "string" ? j.message : res.statusText;
      const e = new Error(`lytex_http_${res.status}: ${msg}`.slice(0, 300)) as Error & { status?: number };
      e.status = res.status;
      throw e;
    }
    return json;
  }

  const paraToken = (j: unknown): Token => {
    const t = j as { accessToken?: string; refreshToken?: string; expireAt?: string; refreshExpireAt?: string };
    if (!t?.accessToken) throw new Error("lytex_token_invalido");
    return {
      accessToken: t.accessToken,
      refreshToken: t.refreshToken ?? "",
      expiraEm: t.expireAt ? Date.parse(t.expireAt) : agora() + 5 * 60_000,
      refreshExpiraEm: t.refreshExpireAt ? Date.parse(t.refreshExpireAt) : 0,
    };
  };

  // oauth2 clientCredentials (securitySchemes.lytexAuth): POST /v2/auth/obtain_token
  // (AuthV2Controller_obtainToken_v2) e POST /v2/auth/refresh_token (AuthV2Controller_refreshToken_v2)
  async function renovar(): Promise<Token> {
    const e = env();
    if (token && token.refreshToken && token.refreshExpiraEm > agora() + 30_000) {
      try {
        return paraToken(await chamar("POST", "/v2/auth/refresh_token", { accessToken: token.accessToken, refreshToken: token.refreshToken }));
      } catch {
        // refresh falhou (usado/expirado, 410): cai para um token novo
      }
    }
    const clientId = e.LYTEX_CLIENT_ID?.trim();
    const clientSecret = e.LYTEX_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) throw new Error("LYTEX_CLIENT_ID/LYTEX_CLIENT_SECRET não configurados (ver .env.example).");
    return paraToken(await chamar("POST", "/v2/auth/obtain_token", { clientId, clientSecret }));
  }

  async function accessToken(forcar = false): Promise<string> {
    if (!forcar && token && token.expiraEm - 60_000 > agora()) return token.accessToken;
    emVoo ??= renovar()
      .then((t) => (token = t))
      .finally(() => {
        emVoo = null;
      });
    return (await emVoo).accessToken;
  }

  // chamada autenticada; um 401 (token revogado/expirado) renova uma vez e repete
  // Consulta (GET) logo após criar a fatura pode dar 502/503/504: repete até 2 vezes, 1 s entre elas. POST nunca repete.
  async function api(metodo: string, caminho: string, corpo?: unknown, extra?: Record<string, string>, tentativa = 0): Promise<unknown> {
    try {
      return await chamar(metodo, caminho, corpo, await accessToken(), extra);
    } catch (e) {
      const st = (e as { status?: number }).status;
      if (metodo === "GET" && (st === 502 || st === 503 || st === 504) && tentativa < 2) {
        await new Promise((r) => setTimeout(r, 1000));
        return api(metodo, caminho, corpo, extra, tentativa + 1);
      }
      if (st !== 401 && st !== 410) throw e;
      return chamar(metodo, caminho, corpo, await accessToken(true), extra);
    }
  }

  // -------------------------------------------------------------------------------------------
  // Recebedores = Subcontas
  // -------------------------------------------------------------------------------------------

  type Subconta = { _id?: string; cpfCnpj?: string; status?: string; documentStatus?: string; walletAccountStatus?: string; onboardingUrl?: string };

  const paraRecebedor = (s: Subconta, provedorId: string): RecebedorNoProvedor => {
    const { status, motivo } = mapearStatusRecebedor(s);
    return { provedorId, status, motivo, documento: s.cpfCnpj ?? null, urlOnboarding: s.onboardingUrl ?? null };
  };

  const consultarRecebedor = async (provedorId: string): Promise<RecebedorNoProvedor> => {
    // SubAccountsController_get_v2: GET /v2/sub-accounts/{id}
    const s = (await api("GET", `/v2/sub-accounts/${encodeURIComponent(provedorId)}`)) as Subconta;
    return paraRecebedor(s, provedorId);
  };

  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

  const conta: ContaLytex = {
    // WalletController_getWalletInfo_v2: GET /v2/wallet → balance, futureBalance, minimumWithdrawal, currentTax
    async carteira() {
      const w = (await api("GET", "/v2/wallet")) as { balance?: number; futureBalance?: number; minimumWithdrawal?: number; currentTax?: number } | null;
      return { saldoCentavos: num(w?.balance), saldoFuturoCentavos: num(w?.futureBalance), saqueMinimoCentavos: num(w?.minimumWithdrawal), taxaAtual: num(w?.currentTax) };
    },
    // WalletController_getWalletTransactionsResume_v2: GET /v2/wallet/transactions/resume → in, out, taxes
    async resumoCarteira() {
      const r = (await api("GET", "/v2/wallet/transactions/resume")) as { in?: number; out?: number; taxes?: number } | null;
      return { entradasCentavos: num(r?.in), saidasCentavos: num(r?.out), taxasCentavos: num(r?.taxes) };
    },
    // BankAccountsController_listBankAccounts_v2: GET /v2/bank_accounts?active=true → results[]
    async contasBancarias() {
      type Conta = { _id?: string; owner?: { name?: string }; bank?: { name?: string }; agency?: { number?: string }; account?: { number?: string; dv?: string } };
      const r = (await api("GET", "/v2/bank_accounts?active=true&perPage=100")) as { results?: Conta[] } | null;
      return (r?.results ?? [])
        .filter((c): c is Conta & { _id: string } => typeof c._id === "string")
        .map((c) => ({
          id: c._id,
          banco: c.bank?.name ?? "Não informado",
          agencia: c.agency?.number ?? "Não informado",
          conta: c.account?.number ? `${c.account.number}${c.account.dv ? `-${c.account.dv}` : ""}` : "Não informado",
          titular: c.owner?.name ?? "Não informado",
        }));
    },
    // WalletController_createWithdrawSolicitation_v2: POST /v2/wallet/withdraw {amount:integer>=1, _bankAccountId}
    // → 201 WithdrawSolicitation (status: waiting_approval | approved | rejected | reproved | released)
    async solicitarSaque(valorCentavos, contaBancariaId) {
      if (!Number.isInteger(valorCentavos) || valorCentavos < 1) throw new Error("saque_valor_invalido");
      const w = (await api("POST", "/v2/wallet/withdraw", { amount: valorCentavos, _bankAccountId: contaBancariaId })) as
        | { _id?: string; amount?: number; taxes?: number; status?: string }
        | null;
      return { id: w?._id ?? "", valorCentavos: num(w?.amount) || valorCentavos, taxasCentavos: num(w?.taxes), status: w?.status ?? "waiting_approval" };
    },
  };

  // cabeçalho que escolhe a subconta (parâmetro subRecipientId das rotas /v2/sub-accounts/...)
  const comoSubconta = (subId: string) => ({ subRecipientId: subId });
  const fim = (v?: string) => (v ? v.slice(-4) : "");

  const subconta: ContaSubconta = {
    // SubAccountsController_listBankAccounts_v2: GET /v2/sub-accounts/bank_accounts?active=true → results[]
    // Devolve só o final da agência e da conta: dados bancários completos nunca chegam à tela.
    async contasBancarias(subId) {
      type Conta = { _id?: string; bank?: { name?: string }; agency?: { number?: string }; account?: { number?: string } };
      const r = (await api("GET", "/v2/sub-accounts/bank_accounts?active=true&perPage=20", undefined, comoSubconta(subId))) as { results?: Conta[] } | null;
      return (r?.results ?? [])
        .filter((c): c is Conta & { _id: string } => typeof c._id === "string")
        .map((c) => ({ id: c._id, banco: c.bank?.name ?? "Banco", agenciaFinal: fim(c.agency?.number), contaFinal: fim(c.account?.number) }));
    },
    // SubAccountsController_createWithdrawSolicitationSubAccounts_v2: POST /v2/sub-accounts/withdraw {amount:integer>=1, _bankAccountId}
    // com o cabeçalho subRecipientId → 201 WithdrawSolicitation (status: waiting_approval | approved | rejected | reproved | released)
    async solicitarSaque(subId, valorCentavos, contaBancariaId) {
      if (!Number.isInteger(valorCentavos) || valorCentavos < 1) throw new Error("saque_valor_invalido");
      const w = (await api("POST", "/v2/sub-accounts/withdraw", { amount: valorCentavos, _bankAccountId: contaBancariaId }, comoSubconta(subId))) as
        | { _id?: string; taxes?: number; status?: string }
        | null;
      return { id: w?._id ?? "", taxasCentavos: num(w?.taxes), status: w?.status ?? "waiting_approval" };
    },
  };

  return {
    nome: "lytex",
    consultarRecebedor,
    conta,
    subconta,

    // SubAccountsController_create_v2: POST /v2/sub-accounts
    async criarRecebedor(dados: DadosRecebedorLytex): Promise<RecebedorNoProvedor> {
      const doc = dados.documento.replace(/\D/g, "");
      const tipo = doc.length > 11 ? "pj" : "pf";
      const faltando = [
        !dados.celular && "celular",
        !dados.endereco && "endereco",
        tipo === "pj" && !dados.tipoEmpresa && "tipoEmpresa",
      ].filter(Boolean);
      if (faltando.length) throw new Error(`lytex_dados_recebedor_incompletos: ${faltando.join(",")}`);
      const end = dados.endereco!;
      const corpo = {
        type: tipo,
        cpfCnpj: doc,
        name: dados.nome,
        email: dados.email,
        cellphone: dados.celular!.replace(/\D/g, ""),
        ...(tipo === "pj" ? { fantasyName: dados.nomeFantasia ?? dados.nome, companyType: dados.tipoEmpresa } : {}),
        address: {
          street: end.rua,
          zone: end.bairro,
          city: end.cidade,
          state: end.uf,
          zip: end.cep.replace(/\D/g, ""),
          ...(end.numero ? { number: end.numero } : {}),
          ...(end.complemento ? { complement: end.complemento } : {}),
        },
      };
      const criada = (await api("POST", "/v2/sub-accounts", corpo)) as Subconta;
      if (!criada._id) throw new Error("lytex_subconta_sem_id");
      const r = await consultarRecebedor(criada._id);
      if (r.urlOnboarding) return r;
      // O spec diz que a criação devolve um link de envio de documentos, mas só a LISTAGEM define o
      // campo `onboardingUrl` (PERGUNTAS 47). Tenta achá-lo ali; falha aqui não impede o cadastro.
      try {
        const lista = (await api("GET", `/v2/sub-accounts?search=${encodeURIComponent(doc)}`)) as { results?: Subconta[] };
        const achada = lista.results?.find((x) => x._id === criada._id);
        return { ...r, urlOnboarding: achada?.onboardingUrl ?? criada.onboardingUrl ?? null };
      } catch {
        return { ...r, urlOnboarding: criada.onboardingUrl ?? null };
      }
    },

    // -----------------------------------------------------------------------------------------
    // Cobrança = Fatura com split
    // -----------------------------------------------------------------------------------------

    // InvoicesController_createInvoice_v2: POST /v2/invoices
    async criarCobranca(dados: DadosCobrancaLytex): Promise<Cobranca> {
      // split.recipients: minItems 2, maxItems 10 (schema de split da fatura)
      if (dados.split.length < 2 || dados.split.length > 10) throw new Error("lytex_split_precisa_de_2_a_10_recebedores");
      const soma = dados.split.reduce((s, p) => s + p.valorCentavos, 0);
      if (soma > dados.totalCentavos) throw new Error("split_maior_que_o_total");
      if (!dados.comprador) throw new Error("lytex_comprador_obrigatorio"); // client é obrigatório na fatura
      const docComprador = dados.comprador.documento.replace(/\D/g, "");

      const vence = new Date(agora() + DIAS_VENCIMENTO * 86_400_000).toISOString().slice(0, 10); // dueDate: só data (spec)
      const cartao = !dados.meio || dados.meio === "cartao";
      const corpo = {
        client: {
          type: docComprador.length > 11 ? "pj" : "pf",
          name: dados.comprador.nome,
          cpfCnpj: docComprador,
          ...(dados.comprador.email ? { email: dados.comprador.email } : {}),
        },
        items: [{ name: dados.descricao.slice(0, 255), quantity: 1, value: dados.totalCentavos }],
        description: dados.descricao.slice(0, 255),
        dueDate: vence,
        cancelOverdueDays: 1, // "para não aceitar pagamento após o vencimento, informe 1"
        paymentMethods: {
          pix: { enable: !dados.meio || dados.meio === "pix" },
          boleto: { enable: !dados.meio || dados.meio === "boleto" },
          creditCard: { enable: cartao, ...(cartao && dados.parcelas ? { maxParcels: dados.parcelas } : {}) },
        },
        // type fixedValue = valor em centavos; recebedores são ids de subconta (_recipientId)
        split: { type: "fixedValue", recipients: dados.split.map((p) => ({ _recipientId: p.recebedorProvedorId, value: p.valorCentavos })) },
        // referenceId volta em buscas e webhooks; referenceIdUniqueExt dá unicidade por emissor (idempotência)
        referenceId: dados.pedidoId,
        referenceIdUniqueExt: dados.pedidoId,
        redirect: { urlRedirect: dados.urlRetorno, autoRedirect: true },
        // async=true só no cartão (a pessoa paga no checkout da Lytex, linkCheckout). Em Pix e boleto escolhidos
        // aqui, async=false (padrão) para a fatura já devolver o "copia e cola" e a linha digitável.
        ...(cartao ? { async: true } : {}),
      };
      let fatura: FaturaLytex;
      try {
        fatura = (await api("POST", "/v2/invoices", corpo)) as FaturaLytex;
      } catch (e) {
        // idempotência: se o pedido já gerou fatura, devolve a existente
        // (InvoicesController_getInvoiceByReferenceIdUniqueExt_v2: GET /v2/invoices/referenceIdUniqueExt/{ref})
        const st = (e as { status?: number }).status;
        if (!st || st < 400 || st >= 500) throw e;
        const existente = (await api("GET", `/v2/invoices/referenceIdUniqueExt/${encodeURIComponent(dados.pedidoId)}`).catch(() => null)) as FaturaLytex | null;
        if (!existente?._id) throw e;
        fatura = existente;
      }
      if (!fatura._id) throw new Error("lytex_fatura_sem_id");
      const status = mapearStatusFatura(fatura);
      return { provedorId: fatura._id, status, urlPagamento: fatura.linkCheckout ?? null, pagamento: pagamentoDaFatura(fatura), valorCentavos: valorDaFatura(fatura, status), moeda: MOEDA_LYTEX };
    },

    // InvoicesController_getInvoice_v2: GET /v2/invoices/{id}
    async consultarCobranca(provedorId): Promise<Cobranca> {
      const f = (await api("GET", `/v2/invoices/${encodeURIComponent(provedorId)}`)) as FaturaLytex;
      const status = mapearStatusFatura(f);
      return { provedorId, status, urlPagamento: f.linkCheckout ?? null, pagamento: pagamentoDaFatura(f), valorCentavos: valorDaFatura(f, status), moeda: MOEDA_LYTEX };
    },

    // InvoicesController_cancel_v2: PUT /v2/invoices/cancel/{id} ("Cancelar uma fatura de um determinado cliente").
    // Sem corpo. Fatura já paga não é cancelada por aqui: devolve o status real para o chamador decidir (estorno).
    async cancelarCobranca(provedorId): Promise<Cobranca> {
      const f = (await api("PUT", `/v2/invoices/cancel/${encodeURIComponent(provedorId)}`)) as FaturaLytex | null;
      // a resposta é a fatura (schema Invoice); sem ela, confirma consultando
      const fatura = f?._id ? f : ((await api("GET", `/v2/invoices/${encodeURIComponent(provedorId)}`)) as FaturaLytex);
      const status = mapearStatusFatura(fatura);
      return { provedorId, status, valorCentavos: valorDaFatura(fatura, status), moeda: MOEDA_LYTEX };
    },

    // RefundSolicitationController_create_v2: POST /v2/refund-solicitation {_invoiceId, refundValue} (ambos obrigatórios).
    // Sem valor = total: usa RefundSolicitationController_getMaxValueToRefund_v2 (GET /v2/refund-solicitation/{_invoiceId}/max-value).
    // /v2/splits/{id}/refund (SplitController_refundSplit_v2) só aceita type "total" por split; não é usado.
    // TODO(lytex): unidade de refundValue/maxRefundValue não está dita (assumido centavos como nas faturas), PERGUNTAS 43.
    async estornar(provedorId, valorCentavos): Promise<Cobranca> {
      let valor = valorCentavos;
      if (valor === undefined) {
        const m = (await api("GET", `/v2/refund-solicitation/${encodeURIComponent(provedorId)}/max-value`)) as { maxRefundValue?: number };
        valor = m.maxRefundValue;
      }
      if (!valor || valor < 1) throw new Error("lytex_estorno_sem_valor");
      await api("POST", "/v2/refund-solicitation", { _invoiceId: provedorId, refundValue: valor });
      // a solicitação nasce pendente; a confirmação (status refund) chega por consulta/conciliação
      return { provedorId, status: "estorno_pendente" };
    },

    // O spec NÃO documenta webhooks além de: "informe a URL em Configurações > Integrações > API e responda
    // HTTP 200". Não há lista de eventos, corpo, id de evento nem assinatura/cabeçalho para usar o
    // LYTEX_CALLBACK_SECRET (só aparecem `callbackSecret`/`callbackUrl` em GET /v2/sub-accounts, sem algoritmo).
    // Sem mecanismo documentado de autenticação NÃO se aceita nada (PERGUNTAS 44-46). A conciliação
    // (consultarCobranca) continua funcionando sem webhook.
    async validarWebhook(): Promise<EventoPagamento> {
      throw new IntegracaoPendente("validarWebhook");
    },
  };
}

const instancia = criarLytex();
export const lytex: PaymentProvider = instancia;
// conta própria da Staypse (carteira, contas bancárias, saque): só o admin usa
export const contaLytex: ContaLytex = instancia.conta;
// subcontas dos usuários (saque e contas bancárias)
export const subcontaLytex: ContaSubconta = instancia.subconta;
