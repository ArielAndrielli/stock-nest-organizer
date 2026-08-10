# Módulo "Cadastro de Itens"

Novo módulo autenticado em `/itens`, com listagem em Grid e Cards, pesquisa, filtros, colunas configuráveis por usuário, detalhes do item e importação real de Excel de ponta a ponta. Nada do que já existe (Setor → Vaga → Caixa, histórico, etiquetas, usuários) é alterado.

## Banco de dados

Três tabelas novas, seguindo o padrão atual (RLS + GRANT + papéis administrador/operador/visitante):

- **itens** — campos fixos: `codigo_interno` (inteiro, identificador único), `referencia`, `descricao`, `marca`, `setor`, `tipo_item`, `status`, `imagem_url`, mais uma coluna `extras` (JSON) que guarda **todos** os demais campos vindos do Excel sem precisar alterar o banco.
- **item_campos** — catálogo de campos: rótulo, chave, se é fixo ou vem do `extras`, se é filtrável, ordem. Alimentado automaticamente quando a importação encontra colunas novas. É isso que torna "Configurar Colunas" e os filtros dinâmicos.
- **item_preferencias** — preferências por usuário: colunas visíveis, ordem das colunas, modo Grid/Cards.

Índices para performance: único em `codigo_interno`, índices em marca/setor/tipo/status e índice de busca textual sobre referência + descrição + marca + setor. Leitura para qualquer usuário logado; criar/editar para operador e administrador; excluir só administrador.

## Tela principal `/itens`

Cabeçalho: título "Cadastro de Itens" + `[Pesquisar] [Filtros] [Configurar Colunas] [Grid/Cards] [Importar Excel]`, no mesmo estilo visual do sistema.

- **Grid**: cabeçalho fixo na rolagem, ordenação clicando na coluna, rolagem horizontal, menu ⋮ por linha (Visualizar / Editar / Excluir com confirmação) e paginação. Busca, filtros e ordenação são feitos **no banco**, nunca carregando tudo no navegador.
- **Cards**: imagem de capa em proporção fixa (placeholder quando não houver), referência e descrição curta, grade responsiva, clique abre os detalhes.
- **Configurar Colunas**: painel lateral listando todos os campos do catálogo com checkbox visível/oculto, botão "Restaurar padrão". Padrão: Código Interno, Referência, Descrição, Marca, Setor. Salvo por usuário.
- **Filtros**: Marca, Setor, Tipo, Status (e demais campos marcados como filtráveis), combináveis, com "Limpar filtros".
- **Detalhes**: modal com "Informações principais" e "Informações adicionais" (todos os campos do `extras`), preparado para edição.
- **Estados**: carregando (skeletons), sem resultados, base vazia (com botão Importar Excel), erro com "Tentar novamente".
- Alternar Grid/Cards preserva pesquisa, filtros e ordenação (guardados na URL).

## Importação de Excel (funcional, ponta a ponta)

Assistente em etapas dentro de um modal "Importar Cadastro via Excel":

1. **Upload** — arrastar ou selecionar, valida `.xlsx`/`.xls`, mostra nome e tamanho, permite remover/trocar.
2. **Leitura** — a planilha é lida no navegador e todas as colunas são identificadas, inclusive as que não existem hoje no sistema.
3. **Mapeamento** — tabela "Coluna do Excel → Campo do sistema" com sugestão automática por similaridade de nome; o usuário pode corrigir, criar o campo como adicional (vai para `extras`) ou ignorar a coluna.
4. **Validação e prévia** — primeiras 50 linhas, marcando válidos, a atualizar (código interno já existente) e com erro (obrigatório ausente, tipo inválido, duplicado no arquivo).
5. **Confirmação** — resumo "Novos X / Atualizações Y / Com erro Z".
6. **Processamento** — envio em lotes para o servidor com barra de progresso e contadores; linhas inválidas são puladas, as válidas são gravadas.
7. **Resultado** — total processado, novos, atualizados, erros; lista de erros com linha do Excel, código, campo e motivo, e download do relatório de erros em CSV.

Ao concluir, o modal fecha e a listagem recarrega sozinha com os novos totais.

## Exportação

Botão "Exportar Excel" respeitando pesquisa, filtros e colunas visíveis, com opção de exportar todos os campos.

## Detalhes técnicos

- Rotas: `src/routes/_authenticated/itens.tsx` (+ componentes em `src/components/itens/`), link "Itens" no `AppShell`.
- Leitura/escrita via TanStack Query + client Supabase, no mesmo padrão de `src/lib/queries.ts`; paginação por `range()` e ordenação/filtro por query no banco.
- Upsert da importação por `codigo_interno` em lotes (~500 linhas), evitando duplicidade; campos não mapeados vão para `extras` e são registrados em `item_campos`.
- Parsing do Excel com a biblioteca SheetJS (`xlsx`) no navegador — evita subir arquivos grandes e mantém o servidor leve.
- Permissões reaproveitam `usePermissions()`; visitante apenas consulta, importação/edição para operador e administrador, exclusão só administrador.
- Tipos gerados serão regenerados após a migração; o código do módulo é escrito depois disso.

## Ordem de execução

1. Migração das três tabelas, índices, RLS e GRANTs.
2. Instalar `xlsx` e criar camada de dados/hooks do módulo.
3. Tela principal com Grid, Cards, busca, filtros, colunas e detalhes.
4. Assistente de importação completo + exportação.
5. Verificação do fluxo no preview.
