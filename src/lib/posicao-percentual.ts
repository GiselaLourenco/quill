import type { createClient } from "@/lib/supabase/server";
import { paginaDoPercentual } from "@/lib/posicao";

// Sessões registradas em % guardam o % digitado e as páginas convertidas.
// Quando o total de páginas do livro muda (outra edição, total corrigido), as
// páginas são refeitas a partir do % — ele é a fonte da verdade.
export async function recalcularPaginasDoPercentual(
  supabase: Awaited<ReturnType<typeof createClient>>,
  itemId: string,
  totalPaginas: number,
) {
  if (!(totalPaginas > 0)) return;
  const { data } = await supabase
    .from("sessions")
    .select("id, percent_start, percent_end")
    .eq("item_id", itemId)
    .not("percent_end", "is", null);
  for (const s of data ?? []) {
    await supabase
      .from("sessions")
      .update({
        unit_end: paginaDoPercentual(s.percent_end as number, totalPaginas),
        ...(s.percent_start != null && {
          unit_start: paginaDoPercentual(s.percent_start as number, totalPaginas),
        }),
      })
      .eq("id", s.id);
  }
}
