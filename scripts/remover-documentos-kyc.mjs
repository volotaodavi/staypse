// Remove os documentos de KYC próprio (fim da Etapa 3: KYC agora é só pela Lytex).
// Apaga todos os arquivos do bucket "documentos-produtores" e o próprio bucket,
// pela API de Storage (o Supabase não deixa apagar arquivos por SQL), e registra
// no log de auditoria. NÃO guarda cópia (LGPD: minimização).
//
// Uso: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SECRET_KEY=... node scripts/remover-documentos-kyc.mjs
// (as chaves vêm do ambiente; nunca ficam no código)
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SECRET_KEY;
if (!url || !chave) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY no ambiente.");
  process.exit(1);
}
const sb = createClient(url, chave, { auth: { persistSession: false } });
const BUCKET = "documentos-produtores";

const { data: buckets, error: erroLista } = await sb.storage.listBuckets();
if (erroLista) throw erroLista;
if (!buckets.some((b) => b.id === BUCKET)) {
  console.log("Bucket de documentos já não existe. Nada a fazer.");
  process.exit(0);
}

// lista recursiva (pastas = id do usuário)
async function listar(prefixo = "") {
  const caminhos = [];
  for (let pagina = 0; ; pagina++) {
    const { data, error } = await sb.storage.from(BUCKET).list(prefixo, { limit: 1000, offset: pagina * 1000 });
    if (error) throw error;
    for (const item of data) {
      const caminho = prefixo ? `${prefixo}/${item.name}` : item.name;
      if (item.id === null) caminhos.push(...(await listar(caminho))); // pasta
      else caminhos.push(caminho);
    }
    if (data.length < 1000) break;
  }
  return caminhos;
}

const arquivos = await listar();
for (let i = 0; i < arquivos.length; i += 100) {
  const { error } = await sb.storage.from(BUCKET).remove(arquivos.slice(i, i + 100));
  if (error) throw error;
}
const { error: erroBucket } = await sb.storage.deleteBucket(BUCKET);
if (erroBucket) throw erroBucket;

const { error: erroLog } = await sb.from("audit_log").insert({
  acao: "documentos_kyc_apagados",
  entidade: "sistema",
  entidade_id: "00000000-0000-0000-0000-000000000000",
  detalhes: { arquivos_apagados: arquivos.length, bucket_removido: BUCKET, copia_mantida: false },
});
if (erroLog) throw erroLog;
console.log(`Removidos ${arquivos.length} arquivo(s) e o bucket "${BUCKET}". Registro gravado no log de auditoria.`);
