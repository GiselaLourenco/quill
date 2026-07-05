import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { ChallengeForm } from "@/components/challenge-form";

export default async function NewChallengePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUserId();
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data: books } = await supabase
    .from("media_items")
    .select("id, title")
    .order("title", { ascending: true });

  return (
    <>
      <header className="flex items-center gap-2 border-b-2 border-ink bg-white px-4 py-3">
        <Link href="/juntos" aria-label="Voltar" className="text-lg">
          ←
        </Link>
        <span className="font-serif text-lg">Criar desafio</span>
      </header>
      <main className="mx-auto w-full max-w-sm flex-1 px-4 py-6">
        {error && <p className="mb-4 text-sm font-medium text-coral">{error}</p>}
        <ChallengeForm books={books ?? []} />
      </main>
    </>
  );
}
