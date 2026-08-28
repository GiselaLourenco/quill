#!/usr/bin/env node
/**
 * Otimizador de imagens do Quill.
 *
 * Converte arte-fonte (SVG com raster embutido, PNG, JPG) em WebP leve e
 * dimensionado para a web. Resolve o problema de assets pesados: os SVGs do
 * mascote têm ~3MB de raster embutido; aqui viram WebP de dezenas de KB.
 *
 * Fluxo:
 *   1. Coloque a arte-fonte em `assets-src/` (mantida como fonte da verdade,
 *      fora do bundle — não é servida ao usuário).
 *   2. Rode: `node scripts/optimize-images.mjs`
 *   3. Os WebP saem em `public/img/`, espelhando a estrutura de pastas.
 *   4. No código, use next/image com `/img/<caminho>.webp`.
 *
 * Opções:
 *   --width=256     largura máxima (mantém proporção). Padrão 512.
 *   --quality=82    qualidade WebP 1–100. Padrão 82.
 *   --src=dir       pasta de origem. Padrão assets-src.
 *   --out=dir       pasta de saída. Padrão public/img.
 *   --density=200   DPI ao rasterizar SVG (nitidez). Padrão 200.
 *
 * Usa o `sharp` que já vem com o Next (dependência de imagem). Se um dia sumir:
 * `npm i -D sharp`.
 */
import { readdirSync, statSync, mkdirSync, existsSync } from "node:fs";
import { join, relative, dirname, extname, basename } from "node:path";
import sharp from "sharp";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);

const SRC = args.src || "assets-src";
const OUT = args.out || "public/img";
const WIDTH = Number(args.width || 512);
const QUALITY = Number(args.quality || 82);
const DENSITY = Number(args.density || 200);
const EXTS = new Set([".svg", ".png", ".jpg", ".jpeg", ".webp"]);

/**
 * Artes que vêm com margem transparente sobrando e precisam ser aparadas.
 *
 * A maioria dos mascotes já vem enquadrada; aparar todos mudaria o
 * enquadramento em telas que hoje estão certas. Por isso a lista é explícita:
 * só entra aqui a arte que chega com sobra de fato.
 */
const APARAR = new Set([
  "quill-explorando",
  // Avatares: a arte ocupa ~150x210 de um quadro de 512x512 e cada uma senta
  // num canto diferente. Sem aparar, o Quill aparece minúsculo e torto dentro
  // do círculo — aparado, cada um fica centralizado e do mesmo tamanho.
  "quill-bolado", "quill-inlove", "quill-ok", "quill-omg", "quill-rindo", "quill-zen",
]);

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (EXTS.has(extname(entry).toLowerCase())) out.push(full);
  }
  return out;
}

if (!existsSync(SRC)) {
  console.error(`Pasta de origem não encontrada: ${SRC}`);
  process.exit(1);
}

const files = walk(SRC);
if (files.length === 0) {
  console.log(`Nenhuma imagem em ${SRC}. Nada a fazer.`);
  process.exit(0);
}

let totalIn = 0;
let totalOut = 0;

for (const file of files) {
  const rel = relative(SRC, file);
  const outPath = join(OUT, dirname(rel), `${basename(rel, extname(rel))}.webp`);
  mkdirSync(dirname(outPath), { recursive: true });

  const inputSize = statSync(file).size;
  const nome = basename(rel, extname(rel));

  let pipeline = sharp(file, { density: DENSITY });
  if (APARAR.has(nome)) pipeline = pipeline.trim();

  const info = await pipeline
    .resize(WIDTH, WIDTH, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(outPath);

  totalIn += inputSize;
  totalOut += info.size;
  const kb = (n) => `${(n / 1024).toFixed(0)}KB`;
  console.log(
    `✓ ${rel} → ${relative(process.cwd(), outPath)}  ${kb(inputSize)} → ${kb(info.size)} (${info.width}×${info.height})`,
  );
}

const mb = (n) => `${(n / 1024 / 1024).toFixed(2)}MB`;
console.log(`\n${files.length} imagem(ns): ${mb(totalIn)} → ${mb(totalOut)}`);
