// Converte um link normal do Spotify (playlist/álbum/faixa) no formato de
// embed usado pelo iframe. Retorna null se não reconhecer o link.
export function toSpotifyEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith("open.spotify.com")) return null;
    if (parsed.pathname.startsWith("/embed/")) return url;
    return `https://open.spotify.com/embed${parsed.pathname}`;
  } catch {
    return null;
  }
}
