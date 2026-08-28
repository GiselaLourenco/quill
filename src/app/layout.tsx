import type { Metadata } from "next";
import { Archivo_Black, Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { getAjustesImagem, getSlotsImagem, getVersaoIcone } from "@/lib/ajustes-imagem";
import { listarArtes } from "@/lib/artes";
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

export async function generateMetadata(): Promise<Metadata> {
  // O ícone é servido por rota (a arte vem do banco). O `?v=` muda quando o
  // admin troca a arte — sem isso o navegador segue mostrando o favicon antigo.
  const supabase = await createClient();
  const v = await getVersaoIcone(supabase);

  return {
    title: "Quill",
    description: "Estante, sessões de leitura e comunidade — no seu ritmo.",
    icons: {
      icon: [{ url: `/api/icone?tamanho=32&v=${v}`, type: "image/png", sizes: "32x32" }],
      apple: [{ url: `/api/icone?tamanho=180&v=${v}`, type: "image/png", sizes: "180x180" }],
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
  const supabase = await createClient();
  const [ajustes, slots, admin] = await Promise.all([
    getAjustesImagem(supabase),
    getSlotsImagem(supabase),
    ehAdmin(),
  ]);
  // A galeria de artes só interessa a quem pode editar.
  const catalogo = admin ? listarArtes() : [];

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
