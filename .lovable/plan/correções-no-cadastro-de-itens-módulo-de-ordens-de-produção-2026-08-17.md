# Correções no Cadastro de Itens + módulo de Ordens de Produção

## 1. Corrigir o erro ao salvar item ("record new has no field updated_at")

Causa confirmada: as tabelas de itens usam a coluna `atualizado_em`, mas os gatilhos de atualização automática tentam gravar em `updated_at`, que não existe. Isso derruba qualquer edição de item — e também a gravação de preferências de visualização.

Correção: criar uma função de gatilho que atualize `atualizado_em` e apontar os três gatilhos (itens, campos de item, preferências) para ela.

## 2. Corrigir a visualização travada em cards

O mesmo gatilho quebrado impedia salvar a preferência de modo de visualização, então o botão grade/cards não tinha efeito. Além da correção acima:

- A troca grade/cards passa a valer imediatamente na tela (estado local), mesmo antes de gravar.
- Novo botão "Salvar preferências" (grava modo, colunas visíveis e registros por página) e "Restaurar padrão" (volta às colunas e ao modo padrão).
- Mensagens de sucesso/erro via toast, para o usuário saber se gravou.

## 3. Limite de registros por página

Seletor com 10, 25, 50, 100 e 200 registros por página, ao lado da paginação. O valor escolhido entra nas preferências salvas do usuário e a paginação volta para a página 1 ao mudar.

## 4. Exportação de planilha

O menu "Exportar" passa a abrir um diálogo com duas escolhas:

- Abrangência: apenas a página atual, ou todos os registros do filtro/busca atual (buscados em lotes do banco, com indicador de progresso).
- Colunas: apenas as visíveis, ou todos os campos.

## 5. Nova aba "Ordens de Produção"

Nova entrada no menu, com duas visualizações alternáveis:

- **Grade**: tabela com nº da ordem, referência, produto, quantidade, status, criador e data, com busca e filtro por status.
- **Kanban**: colunas por status (Aguardando separação, Em separação, Separação concluída, Concluído, Cancelado) com cartões arrastáveis entre colunas para mudar o status.

Criação de ordem:

- Campos obrigatórios: nº da ordem (único, sugerido automaticamente e editável), referência, descrição do produto, quantidade. Status inicial sempre "Aguardando separação"; criador e data preenchidos automaticamente.
- Seção de materiais: o usuário busca itens já cadastrados no Cadastro de Itens (mesma base), escolhe o tipo (cartão, embalagem, etiqueta, adesivo, matéria-prima, caixa) e informa a quantidade de cada um. Vários materiais por ordem, com edição e remoção.

Detalhe da ordem: dados da ordem, lista de materiais com quantidades, alteração de status pelo fluxo definido, e histórico de criação/alterações seguindo o padrão já usado no sistema.

Permissões: visitante apenas visualiza; operador cria e altera status; administrador também exclui/cancela.

## Detalhes técnicos

- Migração 1 (correção): `public.set_atualizado_em()` e recriação dos gatilhos de `itens`, `item_campos`, `item_preferencias`.
- Migração 2 (novo módulo):
  - `ordens_producao`: numero (único), referencia, descricao, quantidade, status (enum `status_ordem`), criado_por (uuid), criado_por_email, criado_em, atualizado_em.
  - `ordem_itens`: ordem_id (FK cascade), item_id (FK `itens`), tipo_material, quantidade, snapshot de referência/descrição.
  - GRANTs para `authenticated`/`service_role`, RLS: leitura para autenticados, escrita via `pode_editar()`, exclusão via papel administrador; gatilhos de histórico reaproveitando `log_historico`.
  - `item_preferencias` ganha `por_pagina` (padrão 25).
- Front-end: `src/lib/ordens.ts` (hooks React Query), rotas `_authenticated/ordens.tsx` e `_authenticated/ordem.$id.tsx`, componentes em `src/components/ordens/`, link em `AppShell`. Exportação total em lotes em `src/lib/itens.ts`.
- Kanban com arrastar/soltar usando HTML5 drag-and-drop (sem nova dependência) e fallback por menu de status no mobile.
