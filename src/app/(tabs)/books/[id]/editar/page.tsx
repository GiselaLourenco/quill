import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { updateMediaItem } from "@/app/actions/media-items";
import { AddBookForm } from "@/components/add-book-form";

export default async function EditBookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const userId = await requireUserId();
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data: item } = await supabase
    .from("media_items")
    .select(
      "id, user_id, title, creator, genre, total_units, total_chapters, spotify_url, cover_kind, cover_url",
    )
    .eq("id", id)
    .maybeSingle();

  if (!item || item.user_id !== userId) notFound();

  return (
    <>
      <header className="flex items-center gap-2 border-b-2 border-ink bg-white px-4 py-3">
        <Link href={`/books/${id}`} aria-label="Voltar para o livro" className="text-lg">
          ←
        </Link>
        <span className="font-serif text-lg">Editar livro</span>
      </header>
      <main className="flex flex-1 justify-center px-4 py-6">
        <div className="w-full max-w-sm">
          <AddBookForm
            serverError={error}
            action={updateMediaItem}
            submitLabel="Salvar alterações"
            initial={{
              id: item.id,
              title: item.title,
              creator: item.creator,
              genre: item.genre,
              total_units: item.total_units,
              total_chapters: item.total_chapters,
              spotify_url: item.spotify_url,
              cover_kind: item.cover_kind,
              cover_url: item.cover_url,
            }}
          />
        </div>
      </main>
    </>
  );
}
