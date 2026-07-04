function heatColor(minutes: number): string {
  if (minutes <= 0) return "var(--color-paper)";
  if (minutes < 30)
    return "color-mix(in srgb, var(--color-moss) 35%, var(--color-paper))";
  if (minutes < 90) return "var(--color-moss)";
  return "var(--color-moss-dark)";
}

export function HeatmapGrid({
  days,
  todayKey,
  leadingBlanks = 0,
}: {
  days: { date: string; minutes: number }[];
  todayKey?: string;
  leadingBlanks?: number;
}) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {Array.from({ length: leadingBlanks }).map((_, i) => (
        <div key={`blank-${i}`} />
      ))}
      {days.map((d) => (
        <div
          key={d.date}
          title={`${d.date} — ${Math.round(d.minutes)} min`}
          className="aspect-square rounded border"
          style={{
            background: heatColor(d.minutes),
            borderColor:
              d.date === todayKey ? "var(--color-ink)" : "var(--color-cover-border)",
            borderStyle: d.date === todayKey ? "dashed" : "solid",
            borderWidth: d.date === todayKey ? 1.5 : 1,
          }}
        />
      ))}
    </div>
  );
}
