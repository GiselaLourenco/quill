# Prompt — Modelos ilustrados no Compartilhar

> Cole o bloco abaixo no Claude Code, com este branch (`modelos-compartilhar`) aberto.

```
Implemente a escolha de modelo de cartaz na tela Compartilhar do Quill.

## Contexto
- A tela fica em src/app/(tabs)/compartilhar/ (page.tsx busca os dados do mês; compartilhar-client.tsx desenha o cartaz <Cartaz> e gera o PNG com html-to-image num nó oculto 1080×1920).
- Neste branch há 12 ilustrações 9:16 SEM texto em public/img/compartilhar/modelos/<id>.webp (941×1672).
- A especificação de cada modelo está em docs/compartilhar/modelos.json: para cada id, as áreas vazias (em % da imagem: x, y, largura, altura) onde entram título, ano, os 4 stats (minutos, páginas, dias lidos, horário de ouro), o cartão do livro do período e cartões extras ("destaque", "extras", "stats_lista"). Leia o campo "_leia" e os "obs" de cada modelo. As áreas foram medidas automaticamente: confira e ajuste se algo ficar desalinhado.

## O que fazer
1. Mova o JSON para src/lib/compartilhar-modelos.ts (tipado) e mantenha o cartaz atual como o modelo "classico" (o primeiro da lista e o padrão).
2. No cabeçalho da tela, ao lado do título, adicione um botão-ícone (paleta/camadas) que abre uma bottom sheet "Escolher modelo" com a grade de miniaturas dos modelos (2 colunas, proporção 9:16, nome embaixo, marcação no selecionado).
3. Ao tocar numa miniatura: fecha a sheet, troca o cartaz com uma transição curta e já mostra os dados reais do período selecionado preenchidos no modelo. Mostre o esqueleto (src/components/esqueletos.tsx) enquanto a imagem carrega.
4. Crie um componente <CartazIlustrado modelo periodo livro mes ano /> que posiciona os textos de forma absoluta por cima da imagem usando as % do JSON. Tipografia do projeto: display (caixa alta) para título e números, serifada itálica para livro/autor. Cor do texto pela "tinta" (escura = ink #2C2C2A, clara = papel #F5ECD7). Use auto-ajuste de tamanho para títulos longos e respeite "margem_esq" no cartão do livro.
5. Preenchimento dos extras:
   - "destaque" (cartão grande): livros terminados no mês + nota média do mês; se não houver, a meta do ano ("32 de 50").
   - "extras" (trilha-outono): livros terminados, progresso da meta, nota média, maior sequência de dias.
   - "stats_lista" (mesa-polaroid): os 4 stats em linhas ao lado dos quadradinhos já desenhados, com ✓ nos que forem maiores que zero.
   - modelos com só 3 stats (sofa-boston): não mostrar horário de ouro.
   - Stat zerado mostra "—" em vez de 0.
6. Guarde o último modelo escolhido em localStorage (com try/catch) e reabra nele.
7. O PNG exportado deve usar o mesmo componente no nó oculto 1080×1920, com a imagem de fundo carregada antes do toPng (aguarde img.decode()). A imagem é 941×1672: escale com object-fit: cover.
8. Mobile-first (390px). Siga o CLAUDE.md. Não mexa no banco.

## Para validar
- Crie uma rota temporária /compartilhar/debug que mostra os 12 modelos lado a lado com as áreas do JSON em contorno vermelho, para conferir o alinhamento. Remova antes do merge.
- Teste com um mês sem sessões (stats "—") e com título de livro longo.
- Rode o build e o lint. Faça commit neste branch e abra um PR para a main; não faça deploy direto.
```
