import type { StatusLivro } from "@/lib/types";
import { STATUS_META } from "@/lib/mock-estante";

type Props = {
  status: StatusLivro;
  size?: "xs" | "sm";
};

export function StatusPill({ status, size = "xs" }: Props) {
  const meta = STATUS_META[status];
  const pad = size === "xs" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]";
  return (
    <span
      className={`inline-flex items-center rounded-full border border-ink font-semibold uppercase tracking-wider ${meta.corBg} ${meta.corText} ${pad}`}
    >
      {meta.label}
    </span>
  );
}
