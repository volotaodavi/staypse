// Dados estruturados (JSON-LD) no HTML. O "<" é escapado para o conteúdo
// nunca fechar a tag <script> por engano.
export function JsonLd({ dados }: { dados: object | object[] }) {
  const lista = Array.isArray(dados) ? dados : [dados];
  return (
    <>
      {lista.map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(d).replace(/</g, "\\u003c") }} />
      ))}
    </>
  );
}
