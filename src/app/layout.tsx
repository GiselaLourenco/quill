import type { Metadata, Viewport } from "next";
import { Archivo_Black, Fraunces, Inter } from "next/font/google";
import "./globals.css";
import {
  getAjustesImagemCache,
  getSlotsImagemCache,
  getVersaoIconeCache,
} from "@/lib/ajustes-imagem";
import { catalogoDeArtesCache } from "@/lib/artes";
import { ehAdmin } from "@/app/actions/admin";
import { ImagensProvider } from "@/components/imagens-provider";

const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  weight: "400",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

/**
 * `viewport-fit: cover` é o que faz `env(safe-area-inset-*)` devolver valor.
 * Sem ele a função resolve zero, e o `pb-[env(...)]` da tab bar não empurrava
 * nada — a barra terminava debaixo da faixa de gestos do aparelho, com os
 * rótulos cortados até um scroll forçar o navegador a redesenhar.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f5ecd7",
};

export async function generateMetadata(): Promise<Metadata> {
  // O ícone é servido por rota (a arte vem do banco). O `?v=` muda quando o
  // admin troca a arte — sem isso o navegador segue mostrando o favicon antigo.
  const v = await getVersaoIconeCache();

  return {
    title: "Quill",
    description: "Estante, sessões de leitura e comunidade — no seu ritmo.",
    icons: {
      icon: [{ url: `/api/icone?tamanho=32&v=${v}`, type: "image/png", sizes: "32x32" }],
      apple: [{ url: `/api/icone?tamanho=180&v=${v}`, type: "image/png", sizes: "180x180" }],
    },
    // O iOS ignora `display: standalone` do manifest e olha esta meta: sem ela,
    // o atalho da tela de início continua abrindo aba no Safari.
    appleWebApp: {
      capable: true,
      title: "Quill",
      statusBarStyle: "default",
    },
    other: {
      // O Next emite só o `mobile-web-app-capable` padronizado, que o Safari
      // passou a entender no 17.4. O nome antigo cobre iPhone mais velho —
      // sem ele, ali o atalho volta a abrir aba.
      "apple-mobile-web-app-capable": "yes",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Os ajustes de imagem entram uma vez por navegação e descem por contexto,
  // para nenhuma tela precisar buscar por conta própria. Ficam na raiz (e não
  // no layout das tabs) porque o login também tem arte com slot.
  const [ajustes, slots, admin] = await Promise.all([
    getAjustesImagemCache(),
    getSlotsImagemCache(),
    ehAdmin(),
  ]);
  // A galeria de artes só interessa a quem pode editar. Junta as artes que
  // vieram no código (/public) com as que o admin subiu pelo app.
  const catalogo = admin ? await catalogoDeArtesCache() : [];

  return (
    <html
      lang="pt-BR"
      className={`${archivoBlack.variable} ${fraunces.variable} ${inter.variable} h-full`}
    >
      <body className="min-h-full flex flex-col font-sans antialiased">
        <ImagensProvider ajustes={ajustes} slots={slots} catalogo={catalogo} admin={admin}>
          {children}
        </ImagensProvider>
      </body>
    </html>
  );
}
