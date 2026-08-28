import { redirect } from "next/navigation";

// O registro manual foi unificado na tela de leitura (`/ler` → "Registrar
// leitura"): mesma tela para o pós-timer e para quem leu sem cronômetro.
// A rota antiga continua respondendo para não quebrar links salvos.
export default function ManualEntryPage() {
  redirect("/ler");
}
