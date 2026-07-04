import Link from "next/link";
import { requireUserId } from "@/lib/supabase/auth";
import { AddBookForm } from "@/components/add-book-form";

export default async function NewBookPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUserId();
  const { error } = await searchParams;

  return (
    <>
      <header className="flex items-center gap-2 border-b-2 border-ink bg-white px-4 py-3">
        <Link href="/estante" aria-label="Voltar para a estante" className="text-lg">
          ←
        </Link>
        <span className="font-serif text-lg">Adicionar livro</span>
      </header>
      <main className="flex flex-1 justify-center px-4 py-6">
        <div className="w-full max-w-sm">
          <AddBookForm serverError={error} />
        </div>
      </main>
    </>
  );
}
