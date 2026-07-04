import Link from "next/link";
import { logout } from "@/app/actions/auth";

export function SiteHeader({ displayName }: { displayName: string | null }) {
  return (
    <header className="flex items-center justify-between border-b-2 border-ink bg-white px-4 py-3">
      <Link href="/" className="font-serif text-xl">
        Quill
      </Link>
      <div className="flex items-center gap-4 text-sm">
        <Link href="/profile" className="font-medium hover:underline">
          {displayName ?? "Seu perfil"}
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="rounded border-2 border-ink bg-paper px-3 py-1 font-medium shadow-hard-sm"
          >
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}
