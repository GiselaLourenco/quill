/**
 * Esqueletos das telas (estilo "fantasma": blocos chapados, sem borda nem
 * sombra). Aparecem na hora em que a aba é tocada, enquanto o servidor monta a
 * tela de verdade — sem eles a tela anterior ficava congelada até a resposta
 * inteira chegar, e o app parecia travado.
 *
 * Cada esqueleto copia o espaçamento externo da tela real (padding, gaps,
 * alturas aproximadas) pra troca não dar pulo. Bloco dentro de bloco fica mais
 * escuro sozinho, porque o `bg-ink/10` se soma.
 */

function Bloco({
  className = "",
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  return (
    <div className={`rounded-md bg-ink/10 ${className}`} style={style}>
      {children}
    </div>
  );
}

/** Envolve a tela: um pulso só pra tudo, e um aviso pra leitor de tela. */
function Pulso({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-label="Carregando" className={`animate-pulse motion-reduce:animate-none ${className}`}>
      {children}
    </div>
  );
}

// ---- Home -----------------------------------------------------------------

function HomeTopo() {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-1 flex-col gap-2.5 pt-1">
          <Bloco className="h-7 w-3/5" />
          <Bloco className="h-2.5 w-2/5" />
        </div>
        <Bloco className="h-16 w-16 shrink-0 rounded-full" />
      </div>
      <div className="space-y-3">
        <Bloco className="h-3.5 w-16" />
        <Bloco className="rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <Bloco className="h-[76px] w-[76px] shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Bloco className="h-2.5 w-1/2" />
              <Bloco className="h-7 w-3/4" />
            </div>
          </div>
          <Bloco className="mt-4 h-8 rounded-full" />
        </Bloco>
      </div>
    </>
  );
}

function HomeRestoBlocos() {
  return (
    <>
      <div className="space-y-2">
        <Bloco className="h-3.5 w-28" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Bloco key={i} className="h-[72px] rounded-xl p-3">
              <Bloco className="h-2.5 w-3/4" />
              <Bloco className="mt-3 h-5 w-2/5" />
            </Bloco>
          ))}
        </div>
      </div>
      <Bloco className="rounded-2xl p-4 pt-14">
        <div className="flex h-24 items-end justify-between gap-2">
          {[30, 55, 15, 80, 45, 65, 10].map((h, i) => (
            <Bloco key={i} className="flex-1 rounded-sm" style={{ height: `${h}%` }} />
          ))}
        </div>
      </Bloco>
      <Bloco className="h-28 rounded-md" />
      <Bloco className="h-24 rounded-2xl" />
      <Bloco className="h-[52px] rounded-xl" />
    </>
  );
}

/** Tela inteira da home (loading da rota). */
export function EsqueletoHome() {
  return (
    <Pulso className="flex flex-col gap-5 px-5 pb-8 pt-6">
      <HomeTopo />
      <HomeRestoBlocos />
    </Pulso>
  );
}

/** Só a parte de baixo da home — o topo já chegou e o resto ainda vem. */
export function EsqueletoHomeResto() {
  return (
    <Pulso className="flex flex-col gap-5">
      <HomeRestoBlocos />
    </Pulso>
  );
}

// ---- Estante --------------------------------------------------------------

function Prateleira({ alturas }: { alturas: number[] }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex h-28 items-end gap-2 px-2">
        {alturas.map((h, i) => (
          <Bloco key={i} className="flex-1 rounded-sm" style={{ height: `${h}%` }} />
        ))}
      </div>
      <Bloco className="h-3 rounded-sm" />
    </div>
  );
}

/** Cabeçalho da Estante: seletor Minha/Amigos e, na "Minha", o diário. */
function CabecalhoEstante({ comDiario }: { comDiario: boolean }) {
  return (
    <div className="flex items-center justify-between border-b-2 border-ink/10 px-4 py-3">
      <Bloco className="h-8 w-36 rounded-full" />
      {comDiario && <Bloco className="h-10 w-10" />}
    </div>
  );
}

function EstanteCorpo() {
  return (
    <div className="flex flex-col gap-5 px-4 py-5">
      <Bloco className="p-5">
        <Bloco className="h-6 w-1/2" />
        <Bloco className="mt-2 h-4 w-1/3" />
      </Bloco>
      <div className="flex gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Bloco key={i} className="h-[60px] flex-1" />
        ))}
      </div>
      <Bloco className="h-10" />
      <div className="flex gap-2">
        {[64, 72, 88, 76].map((w, i) => (
          <Bloco key={i} className="h-8 shrink-0 rounded-full" style={{ width: w }} />
        ))}
      </div>
      <Bloco className="flex flex-col gap-4 p-4">
        <Prateleira alturas={[86, 72, 94, 78]} />
        <Prateleira alturas={[80, 92, 70, 86]} />
      </Bloco>
    </div>
  );
}

/** Tela inteira da Estante (loading da rota). */
export function EsqueletoEstante() {
  return (
    <Pulso className="flex flex-1 flex-col">
      <CabecalhoEstante comDiario />
      <EstanteCorpo />
    </Pulso>
  );
}

/** Só a estante — o cabeçalho já está na tela (troca Amigos → Minha). */
export function EsqueletoEstanteCorpo() {
  return (
    <Pulso className="flex flex-1 flex-col">
      <EstanteCorpo />
    </Pulso>
  );
}

// ---- Amigos (feed da Estante) ---------------------------------------------

/** Um cartão do feed: quem fez o quê, capa, título/status e o "adicionar". */
function CartaoAmigo({ titulo, rodape }: { titulo: string; rodape: boolean }) {
  return (
    <Bloco className="p-2.5">
      <div className="mb-2 flex items-center gap-2">
        <Bloco className="h-6 w-6 shrink-0 rounded-full" />
        <Bloco className="h-2.5 w-2/5" />
        <Bloco className="ml-auto h-2 w-10" />
      </div>
      <div className="flex gap-3">
        <Bloco className="aspect-[2/3] w-[92px] shrink-0 rounded-sm" />
        <div className="flex min-w-0 flex-1 flex-col gap-2 pt-0.5">
          <Bloco className={`h-3.5 ${titulo}`} />
          <Bloco className="h-2.5 w-1/3" />
          <Bloco className="mt-1 h-6 w-[72px]" />
        </div>
      </div>
      {rodape && (
        <div className="mt-2 flex justify-end gap-3">
          <Bloco className="h-2.5 w-14" />
          <Bloco className="h-2.5 w-5" />
        </div>
      )}
    </Bloco>
  );
}

function AmigosCorpo() {
  return (
    <div className="flex flex-col px-4 pb-6 pt-4">
      {/* botão "indicar livro" */}
      <Bloco className="mb-4 h-[44px]" />
      <div className="flex flex-col gap-4">
        {/* busca por nome */}
        <Bloco className="h-[38px]" />
        <div className="flex flex-col gap-2">
          <CartaoAmigo titulo="w-3/4" rodape />
          <CartaoAmigo titulo="w-1/2" rodape />
          <CartaoAmigo titulo="w-2/3" rodape />
        </div>
      </div>
    </div>
  );
}

/** Tela inteira da aba Amigos (loading da rota com ?view=amigos). */
export function EsqueletoAmigos() {
  return (
    <Pulso className="flex flex-1 flex-col">
      <CabecalhoEstante comDiario={false} />
      <AmigosCorpo />
    </Pulso>
  );
}

/** Só o feed — o cabeçalho já está na tela (troca Minha → Amigos). */
export function EsqueletoAmigosCorpo() {
  return (
    <Pulso className="flex flex-1 flex-col">
      <AmigosCorpo />
    </Pulso>
  );
}

// ---- Perfil ---------------------------------------------------------------

export function EsqueletoPerfil() {
  return (
    <Pulso className="flex-1 px-6 pb-24 pt-8">
      <div className="flex flex-col items-center gap-3">
        <Bloco className="h-24 w-24 rounded-full" />
        <Bloco className="h-7 w-40" />
        <Bloco className="h-3.5 w-48" />
      </div>
      <div className="mt-8 grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Bloco key={i} className="flex h-[68px] flex-col items-center justify-center gap-2 p-3">
            <Bloco className="h-5 w-8" />
            <Bloco className="h-2 w-12" />
          </Bloco>
        ))}
      </div>
      <Bloco className="mt-3 h-[56px]" />
      <Bloco className="mt-3 h-[56px]" />
      <Bloco className="mt-6 h-32" />
      <Bloco className="mt-6 h-4 w-28" />
      <Bloco className="mt-3 h-40" />
    </Pulso>
  );
}

// ---- Genérico -------------------------------------------------------------

/** Pras telas que não têm esqueleto próprio: título, um card e uma lista. */
export function EsqueletoGenerico() {
  return (
    <Pulso className="flex flex-1 flex-col gap-5 px-4 pb-24 pt-6">
      <Bloco className="h-8 w-2/5" />
      <Bloco className="p-5">
        <Bloco className="h-5 w-1/2" />
        <Bloco className="mt-3 h-3 w-4/5" />
      </Bloco>
      <div className="space-y-3">
        <Bloco className="h-3.5 w-28" />
        <Bloco className="flex flex-col gap-4 p-4">
          <Bloco className="h-3 w-3/4" />
          <Bloco className="h-3 w-3/5" />
          <Bloco className="h-3 w-2/3" />
        </Bloco>
      </div>
    </Pulso>
  );
}

// ---- Compartilhar ---------------------------------------------------------

/** Cartaz 9:16 enquanto a ilustração do modelo carrega. Cobre o pai inteiro. */
export function EsqueletoCartaz() {
  return (
    <Pulso className="absolute inset-0 flex flex-col gap-[5%] bg-paper p-[7%]">
      <Bloco className="mx-auto h-[11%] w-3/5" />
      <Bloco className="h-[22%] rounded-2xl" />
      <div className="grid h-[24%] grid-cols-2 gap-[5%]">
        {Array.from({ length: 4 }, (_, i) => (
          <Bloco key={i} />
        ))}
      </div>
      <Bloco className="h-[14%]" />
    </Pulso>
  );
}
