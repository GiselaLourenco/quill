import type { NextConfig } from "next";

// O host do Supabase sai da env — é de lá que vêm as artes que o admin envia
// pelo app (bucket `artes`, público).
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
const hostSupabase = supabase ? new URL(supabase).hostname : null;

const nextConfig: NextConfig = {
  experimental: {
    // Server Action aceita 1 MB por padrão, e o envio de arte passa por uma.
    // O limite batia ANTES da ação rodar, então a checagem de tamanho de lá
    // nunca via o arquivo grande — o upload só falhava. Nenhuma arte acima de
    // 1 MB tinha entrado no bucket.
    //
    // 4,5 MB é o teto de corpo de requisição da Vercel; passar disso não
    // adianta, a plataforma corta antes.
    serverActions: { bodySizeLimit: "4.5mb" },
  },
  // A galeria de artes e o ícone do app leem /public direto do disco. Na
  // Vercel o `public` fica só no CDN, então sem isto a lista volta vazia em
  // produção e o favicon cai no padrão.
  outputFileTracingIncludes: {
    "/**": ["./public/**"],
  },
  images: {
    // O catálogo de artes inclui SVG (nosso e enviado). Sem isto o otimizador
    // recusa servir. A CSP abaixo é a receita do Next para o caso: o SVG entra
    // isolado, sem script.
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "covers.openlibrary.org",
        pathname: "/b/**",
      },
      ...(hostSupabase
        ? [
            {
              protocol: "https" as const,
              hostname: hostSupabase,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
