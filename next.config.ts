import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A galeria de artes e o ícone do app leem /public/img direto do disco. Na
  // Vercel o `public` fica só no CDN, então sem isto a lista volta vazia em
  // produção e o favicon cai no padrão.
  outputFileTracingIncludes: {
    "/**": ["./public/img/**"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "covers.openlibrary.org",
        pathname: "/b/**",
      },
    ],
  },
};

export default nextConfig;
