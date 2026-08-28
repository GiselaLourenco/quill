import type { NextConfig } from "next";

// O host do Supabase sai da env — é de lá que vêm as artes que o admin envia
// pelo app (bucket `artes`, público).
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
const hostSupabase = supabase ? new URL(supabase).hostname : null;

const nextConfig: NextConfig = {
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
