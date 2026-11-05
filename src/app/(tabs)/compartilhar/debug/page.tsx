// TEMPORÁRIA — conferir o alinhamento dos modelos do Compartilhar. Remover antes do merge.
import Link from "next/link";
import { notFound } from "next/navigation";
import { MODELOS_CARTAZ, type ModeloIlustrado } from "@/lib/compartilhar-modelos";
import { CartazIlustrado } from "../cartaz-ilustrado";
import type { LivroCartaz, PeriodoStats } from "../compartilhar-client";

const CHEIO: PeriodoStats = {
  id: "2026-11",
  rotulo: "Setembro 2026",
  minutos: "1.234",
  paginas: "842",
  diasLidos: "18/30",
  horaOuro: "23h",
  temDados: true,
  livros: [],
  livrosDeAtividade: true,
  numeros: { minutos: 1234, paginas: 842, diasLidos: 18 },
  livrosTerminados: 3,
  notaMedia: 4.33,
  meta: { atual: 32, alvo: 50 },
  maiorSequencia: 9,
};

const VAZIO: PeriodoStats = {
  ...CHEIO,
  minutos: "0",
  paginas: "0",
  diasLidos: "0/30",
  horaOuro: "—",
  temDados: false,
  numeros: { minutos: 0, paginas: 0, diasLidos: 0 },
  livrosTerminados: 0,
  notaMedia: null,
  meta: { atual: 32, alvo: 50 },
  maiorSequencia: 0,
};

const LIVRO_LONGO: LivroCartaz = {
  id: "x",
  titulo: "A Extraordinária e Muito Longa História do Leitor que Nunca Dormia Antes das Três",
  autor: "Maria Clara de Albuquerque Figueiredo",
  nota: 5,
};

const LIVRO_CURTO: LivroCartaz = { id: "y", titulo: "Duna", autor: "Frank Herbert", nota: 4 };

export default async function DebugModelos({
  searchParams,
}: {
  searchParams: Promise<{ vazio?: string; curto?: string; limpo?: string }>;
}) {
  if (process.env.VERCEL_ENV === "production") notFound();
  const { vazio, curto, limpo } = await searchParams;
  const periodo = vazio ? VAZIO : CHEIO;
  const livro = curto ? LIVRO_CURTO : LIVRO_LONGO;
  const ilustrados = MODELOS_CARTAZ.filter((m): m is ModeloIlustrado => m.tipo === "ilustrado");
  const link = (k: string, v: string | undefined) => {
    const p = new URLSearchParams({ ...(vazio && { vazio }), ...(curto && { curto }), ...(limpo && { limpo }) });
    if (v) p.delete(k);
    else p.set(k, "1");
    return `?${p}`;
  };

  return (
    <div className="p-4">
      <h1 className="font-display text-lg uppercase text-ink">Debug · modelos</h1>
      <p className="mt-1 flex flex-wrap gap-3 text-xs text-ink-soft">
        <Link className="underline" href={link("vazio", vazio)}>{vazio ? "mês com dados" : "mês sem sessões"}</Link>
        <Link className="underline" href={link("curto", curto)}>{curto ? "título longo" : "título curto"}</Link>
        <Link className="underline" href={link("limpo", limpo)}>{limpo ? "com contornos" : "sem contornos"}</Link>
      </p>
      <div className="mt-4 grid grid-cols-1 gap-6 min-[700px]:grid-cols-3">
        {ilustrados.map((m) => (
          <div key={m.id} data-modelo={m.id}>
            <p className="mb-1 font-display text-[10px] uppercase tracking-wider text-ink">{m.id}</p>
            <div className="overflow-hidden rounded-lg border-2 border-ink">
              <CartazIlustrado modelo={m} periodo={periodo} livro={livro} mes="Setembro" ano="2026" contornos={!limpo} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
