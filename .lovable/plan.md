
# Fase 1 — Reestruturação Setor → Vaga → Caixa

Escopo aprovado: Lovable Cloud (backend real), setor como entidade, entrega em fases. Esta fase cobre os itens **1, 2, 3, 4 e 5** do pedido. Auth (7), histórico (6) e QR codes (8) ficam para a Fase 2 (dependem desta base pronta).

## O que muda para o usuário

1. **Hierarquia nova**: cadastra Setores → dentro de cada setor cadastra Vagas → dentro de cada vaga cadastra Caixas (nome antigo "sub-item" some por completo).
2. **Dashboard como página inicial** com totais, ocupação e gráficos por setor.
3. **Busca global** no topo: encontra Setor, Vaga ou Caixa por código, nome, descrição ou observações, mostrando o caminho `Setor → Vaga → Caixa`.
4. **Controle de capacidade** por vaga com status visual (🟢 livre, 🟡 quase cheia, 🔴 lotada) e bloqueio ao tentar adicionar caixa em vaga lotada.
5. **Mover caixa** entre vagas preservando todos os dados (mesma caixa, só troca de vaga). O registro da movimentação fica preparado para a Fase 2 (histórico).
6. **UI padronizada** em todos os cards (Setor, Vaga, Caixa): capa, cantos arredondados, sombra suave, hover com expansão (~1.04, transição 250ms), card inteiro clicável, sem botão "Abrir", ações em menu de três pontos, animação de entrada, skeleton no carregamento, toasts para sucesso/erro/confirmação, layout responsivo (desktop/tablet/celular).

## Estrutura de dados (Lovable Cloud)

Tabelas novas em `public`, todas com RLS + GRANTs. Nesta fase ainda não há auth, então RLS libera leitura/escrita para `anon` (será restringida na Fase 2 junto com os papéis).

- `setores` — id, nome, descricao, imagem_url, criado_em
- `vagas` — id, setor_id (fk), codigo, capacidade, observacoes, imagem_url, criado_em
- `caixas` — id, vaga_id (fk), nome, quantidade, descricao, imagem_url, criado_em
- `movimentacoes_caixa` — id, caixa_id, vaga_origem_id, vaga_destino_id, criado_em (usada agora pelo "Mover caixa", exibida como histórico na Fase 2)

Imagens vão para Storage (bucket `catalogo`, público-leitura) e a URL é gravada em `imagem_url`.

Os dados atuais em `localStorage` **não** serão migrados automaticamente (ainda não há usuários reais). Se quiser, posso adicionar um botão de importação depois.

## Rotas

- `/` — Dashboard (nova home)
- `/setores` — lista de setores
- `/setor/$id` — detalhe do setor + vagas
- `/vaga/$id` — detalhe da vaga + caixas + botão "Mover caixa"
- `/buscar?q=...` — resultados da busca global (a barra também mostra resultados inline em tempo real)

`src/lib/vagas-store.ts` (localStorage) é removido; leituras/escritas passam a usar TanStack Query + server functions com Supabase.

## Detalhes técnicos

- Stack: TanStack Start já existente + Lovable Cloud (Supabase gerenciado) + TanStack Query para cache/loading + `recharts` para os gráficos do dashboard.
- Cards compartilham um componente `EntityCard` (capa, título, subtítulo, badges, menu ⋮ com Editar/Excluir/Mover-quando-caixa).
- Animação de entrada por página com Tailwind (`animate-fade-in` já disponível) e skeleton via `@/components/ui/skeleton`.
- Capacidade: status calculado por `soma(caixas.quantidade) / vaga.capacidade` — verde <70%, amarelo 70–99%, vermelho ≥100%. Formulário de nova caixa bloqueia envio e mostra toast de erro quando a soma ultrapassaria a capacidade.
- "Mover caixa": dialog com combobox de vagas (agrupadas por setor), valida capacidade da vaga destino, faz `update` do `vaga_id` e insere linha em `movimentacoes_caixa`.
- Busca global: server function que faz `ilike` nas colunas relevantes das três tabelas e devolve resultados com o caminho já montado; debounce de ~200ms no input.
- Dashboard: uma server function agrega os totais e séries por setor em uma única chamada.

## Fora do escopo desta fase (Fase 2)

- Autenticação e papéis Admin/Operador/Visitante.
- Tela de histórico de alterações (a tabela `movimentacoes_caixa` já começa a ser populada, mas a UI de histórico completo — criação, edição, exclusão, troca de imagem — entra na Fase 2).
- Geração e impressão de QR codes / etiquetas.

Se aprovar, começo ativando o Lovable Cloud, criando as tabelas + storage, e depois construo as telas.
