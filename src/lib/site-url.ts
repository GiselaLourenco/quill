/**
 * URL pública do app — a que entra nos links que o Supabase manda por e-mail.
 * O fallback aponta para a Vercel de propósito: sem `NEXT_PUBLIC_SITE_URL`
 * definido, um reset pedido em localhost geraria um link para localhost, que
 * não abre no celular de quem recebeu.
 */
export function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://quill-three-tau.vercel.app";
}
