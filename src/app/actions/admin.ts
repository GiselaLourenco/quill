"use server";

import { revalidatePath, updateTag } from "next/cache";
import { TAG_ARTES } from "@/lib/supabase/publico";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import {
  BUCKET_ARTES,
  PREFIXO_ARTES_ENVIADAS,
  arteEnviadaValida,
  arteValida,
  ehArteEnviada,
} from "@/lib/artes";

/**
 * Só quem tem `profiles.is_admin` mexe nas artes.
 *
 * Usa `getClaims()` (JWT verificado localmente) como o resto do app —
 * `getUser()` depende de round-trip e volta vazio quando o token está para
 * renovar, o que fazia o admin perder o acesso sem motivo. A garantia real
 * continua sendo a RLS da tabela.
 */
export async function ehAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return false;

  // NÃO cachear esta leitura com client anônimo: `profiles` só é legível por
  // `authenticated`, então a consulta volta vazia, `is_admin` vira false e o
  // editor de artes some da tela. Aconteceu. Com a função na mesma região do
  // banco a consulta custa poucos milissegundos — não vale o risco.
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();
  return Boolean(data?.is_admin);
}

export async function salvarAjusteImagem(input: {
  path: string;
  zoom: number;
  posX: number;
  posY: number;
}): Promise<{ error: string | null }> {
  const userId = await requireUserId();

  // A RLS já barra não-admin, mas checar aqui devolve mensagem em vez de
  // uma escrita silenciosamente ignorada.
  if (!(await ehAdmin())) return { error: "Só o admin ajusta as imagens." };

  if (!input.path.startsWith("/") || input.path.includes("..")) {
    return { error: "Caminho inválido." };
  }
  const limite = (v: number, min: number, max: number) =>
    Math.min(max, Math.max(min, Math.round(v)));

  const supabase = await createClient();
  const { error } = await supabase.from("image_adjustments").upsert(
    {
      path: input.path,
      zoom: limite(input.zoom, 50, 300),
      pos_x: limite(input.posX, 0, 100),
      pos_y: limite(input.posY, 0, 100),
      updated_at: new Date().toISOString(),
      updated_by: userId,
    },
    { onConflict: "path" },
  );

  if (error) return { error: "Não foi possível salvar o ajuste." };

  // O ajuste vale para o app inteiro assim que salva — sem novo deploy.
  updateTag(TAG_ARTES);
  revalidatePath("/", "layout");
  return { error: null };
}

export async function limparAjusteImagem(path: string): Promise<{ error: string | null }> {
  await requireUserId();
  if (!(await ehAdmin())) return { error: "Só o admin ajusta as imagens." };

  const supabase = await createClient();
  await supabase.from("image_adjustments").delete().eq("path", path);
  updateTag(TAG_ARTES);
  revalidatePath("/", "layout");
  return { error: null };
}

/**
 * Define o que aparece num ponto fixo do app: qual arte e como enquadrada.
 * `src: null` devolve o ponto para a arte que o código define.
 */
export async function salvarSlotImagem(input: {
  slot: string;
  src: string | null;
  zoom: number;
  posX: number;
  posY: number;
}): Promise<{ error: string | null }> {
  const userId = await requireUserId();
  if (!(await ehAdmin())) return { error: "Só o admin ajusta as imagens." };

  if (!/^[a-z0-9.\-]{3,60}$/.test(input.slot)) return { error: "Slot inválido." };

  const supabase = await createClient();

  // A arte só pode ser uma que já existe: em /public ou no bucket de artes
  // enviadas. O cliente não grava caminho arbitrário.
  if (input.src !== null) {
    const existe = ehArteEnviada(input.src)
      ? await arteEnviadaValida(supabase, input.src)
      : arteValida(input.src);
    if (!existe) return { error: "Arte inexistente." };
  }

  const limite = (v: number, min: number, max: number) =>
    Math.min(max, Math.max(min, Math.round(v)));

  const { error } = await supabase.from("image_slots").upsert(
    {
      slot: input.slot,
      src: input.src,
      zoom: limite(input.zoom, 50, 300),
      pos_x: limite(input.posX, 0, 100),
      pos_y: limite(input.posY, 0, 100),
      updated_at: new Date().toISOString(),
      updated_by: userId,
    },
    { onConflict: "slot" },
  );

  if (error) return { error: "Não foi possível salvar." };

  // Vale para o app inteiro assim que salva — sem novo deploy.
  updateTag(TAG_ARTES);
  revalidatePath("/", "layout");
  return { error: null };
}

export async function limparSlotImagem(slot: string): Promise<{ error: string | null }> {
  await requireUserId();
  if (!(await ehAdmin())) return { error: "Só o admin ajusta as imagens." };

  const supabase = await createClient();
  await supabase.from("image_slots").delete().eq("slot", slot);
  updateTag(TAG_ARTES);
  revalidatePath("/", "layout");
  return { error: null };
}

/** Tipos que o navegador desenha sem susto e que o `next/image` aceita. */
const TIPOS_ARTE: Record<string, string> = {
  "image/webp": "webp",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/svg+xml": "svg",
};

const TAMANHO_MAXIMO = 5 * 1024 * 1024;

/**
 * Sobe uma arte nova pelo próprio app.
 *
 * Vai para o Storage, não para /public: em produção o disco é só leitura, e
 * gravar em /public exigiria deploy. A arte entra no mesmo catálogo das de
 * /public/img e pode ir para qualquer ponto na hora.
 */
export async function enviarArte(
  formData: FormData,
): Promise<{ url: string | null; error: string | null }> {
  await requireUserId();
  if (!(await ehAdmin())) return { url: null, error: "Só o admin envia artes." };

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { url: null, error: "Escolha um arquivo." };
  }
  const extensao = TIPOS_ARTE[arquivo.type];
  if (!extensao) return { url: null, error: "Formato não aceito (use PNG, WEBP, JPG ou SVG)." };
  if (arquivo.size > TAMANHO_MAXIMO) return { url: null, error: "A imagem passa de 5 MB." };

  // Nome legível na galeria, sem acento nem espaço, com sufixo para duas artes
  // de mesmo nome não se atropelarem.
  const base = arquivo.name
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const nome = `${base || "arte"}-${Date.now().toString(36)}.${extensao}`;

  const supabase = await createClient();
  const { error } = await supabase.storage
    .from(BUCKET_ARTES)
    .upload(nome, arquivo, { contentType: arquivo.type, upsert: false });

  if (error) return { url: null, error: "Não foi possível enviar a imagem." };

  updateTag(TAG_ARTES);
  revalidatePath("/", "layout");
  return { url: `${PREFIXO_ARTES_ENVIADAS}${nome}`, error: null };
}

/**
 * Tira uma arte da galeria.
 *
 * Enviada pelo admin: apaga do Storage, de vez. Vinda do código (/public):
 * só some da lista — o arquivo está no repositório e o disco em produção é só
 * leitura, então "apagar" ali pediria deploy. Some dos dois jeitos para quem
 * escolhe arte; o que já usa a arte num ponto do app continua como está.
 */
export async function removerArte(src: string): Promise<{ error: string | null }> {
  const userId = await requireUserId();
  if (!(await ehAdmin())) return { error: "Só o admin remove artes." };

  const supabase = await createClient();

  if (ehArteEnviada(src)) {
    const nome = decodeURIComponent(src.slice(PREFIXO_ARTES_ENVIADAS.length));
    if (!nome || nome.includes("/")) return { error: "Arte inválida." };
    const { error } = await supabase.storage.from(BUCKET_ARTES).remove([nome]);
    if (error) return { error: "Não foi possível remover a imagem." };
  } else {
    if (!src.startsWith("/") || src.includes("..")) return { error: "Caminho inválido." };
    const { error } = await supabase
      .from("artes_ocultas")
      .upsert({ path: src, hidden_at: new Date().toISOString(), hidden_by: userId }, { onConflict: "path" });
    if (error) return { error: "Não foi possível esconder a arte." };
  }

  updateTag(TAG_ARTES);
  revalidatePath("/", "layout");
  return { error: null };
}

/** Devolve para a galeria uma arte de /public que estava escondida. */
export async function restaurarArte(path: string): Promise<{ error: string | null }> {
  await requireUserId();
  if (!(await ehAdmin())) return { error: "Só o admin mexe nas artes." };

  const supabase = await createClient();
  await supabase.from("artes_ocultas").delete().eq("path", path);
  updateTag(TAG_ARTES);
  revalidatePath("/", "layout");
  return { error: null };
}
