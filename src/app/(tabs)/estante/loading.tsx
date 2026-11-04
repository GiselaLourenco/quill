"use client";

import { useSearchParams } from "next/navigation";
import { EsqueletoAmigos, EsqueletoEstante } from "@/components/esqueletos";

/**
 * A aba Amigos é a mesma rota (/estante?view=amigos) — o loading lê o parâmetro
 * pra não mostrar prateleiras quando quem vai chegar é o feed dos amigos (ex.:
 * vindo de um aviso do sino).
 */
export default function Loading() {
  const view = useSearchParams().get("view");
  return view === "amigos" ? <EsqueletoAmigos /> : <EsqueletoEstante />;
}
