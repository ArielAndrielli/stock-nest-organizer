# Melhorias: dashboard de OPs, imagens e usabilidade

## 1. Estatísticas de Ordens de Produção no Dashboard

Nova seção no Dashboard, abaixo dos dados de estoque:

- Cartões de resumo: total de ordens, em aberto (aguardando + em separação), concluídas e canceladas.
- Gráfico de pizza: ordens por status (com as cores já usadas nos badges).
- Gráfico de barras: ordens criadas por mês (últimos 6 meses).
- Gráfico de barras: quantidade total de materiais por tipo (cartão, embalagem, etiqueta, adesivo, matéria-prima, caixa).

## 2. Imagem na Ordem de Produção

- Campo de imagem (mesmo componente já usado em setores/vagas/caixas) na criação e na tela de detalhe da ordem.
- No Kanban, a imagem vira a capa do card: foto no topo, e nº da OP, referência, produto, quantidade e status logo abaixo.
- Na visão em grade, miniatura discreta ao lado das informações.

## 3. Visualizador de imagem com zoom

- Ao clicar na imagem de um item cadastrado, ela abre centralizada na tela, ampliada, com fundo escurecido e botão de fechar (também fecha com Esc ou clique fora).
- Mesmo comportamento para a imagem da ordem de produção quando o usuário está apenas visualizando (não em edição).

## 4. Ordenação das OPs

Listagem em grade e colunas do Kanban passam a ordenar em ordem crescente pelo nº da OP.

## 5. Mostrar/ocultar senha

Botão de olho nos campos de senha das abas Entrar e Cadastrar.

## 6. Referência com autocompletar na criação de OP

No campo Referência da nova ordem, conforme o usuário digita aparecem sugestões vindas do Cadastro de Itens (referência + descrição). Ao escolher uma, a descrição do produto é preenchida automaticamente (ainda editável).

## Detalhes técnicos

- Migração: `ALTER TABLE public.ordens_producao ADD COLUMN imagem_url text;` (sem mudança de RLS).
- `src/lib/ordens.ts`: `imagem_url` no tipo `Ordem`, aceito em `useCriarOrdem` e em uma nova mutação `useAtualizarOrdem`; ordenação `numero` ascendente em `useOrdens`.
- `src/lib/queries.ts`: novo `useOrdensStats` lendo `ordens_producao(status, criado_em)` e `ordem_itens(tipo_material, quantidade)`; agregação no cliente.
- `src/routes/_authenticated/index.tsx`: seção de OPs com recharts (Pie + Bar), reutilizando o componente `Stat`.
- Novo `src/components/ImageViewer.tsx` (Dialog sem borda, `img` com `object-contain`, `max-h-[85vh]`), usado em `ItemDetalhes.tsx` e `ordem.$id.tsx`.
- `NovaOrdem.tsx`: `ImageField` + autocompletar de referência via `useItens({ q: termoRef, porPagina: 8 })` com debounce, popover de sugestões preenchendo `descricao`.
- `ordens.tsx`: card Kanban reestruturado (capa `aspect-video object-cover` + corpo).
- `auth.tsx`: estado `verSenha` e botão com ícones `Eye`/`EyeOff` dentro do input.
