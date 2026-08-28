import { LoginClient } from "./login-client";

// `?recuperar=1` abre direto no formulário de recuperação — é pra onde a tela
// de link vencido manda quem precisa pedir outro.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ recuperar?: string }>;
}) {
  const { recuperar } = await searchParams;

  return <LoginClient modoInicial={recuperar ? "recuperar" : "login"} />;
}
