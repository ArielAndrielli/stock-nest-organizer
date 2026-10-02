# Novos campos no cadastro de itens

## O que muda para o usuário
Os itens ganham estes campos no formulário de cadastro e edição, na tela de detalhes, na grade e nos cards (quando a coluna estiver ativada), nos filtros, na exportação e na importação de planilha:

- **Marca**: já existe e continua como está.
- **Unidade de medida**: lista com UN, KG, G, CX, PCT, L, ML, M, M², RL e PR.
- **Código de barras**: texto livre (EAN/GTIN), também pesquisável na busca.
- **Fornecedor**: seleção com busca entre os fornecedores já cadastrados. Na importação, o fornecedor é reconhecido pelo código, pela razão social ou pelo CNPJ.
- **Custo de aquisição** e **Preço de venda**: valores em R$, com a margem calculada e mostrada nos detalhes.
- **Estoque mínimo** e **Estoque máximo**: números, com aviso quando o mínimo for maior que o máximo.
- **Localização física**: Depósito, Corredor e Prateleira, cada um em seu próprio campo.
- **Status**: passa a ser só Ativo ou Inativo (o padrão é Ativo), com selo colorido na grade. Itens com status diferente hoje serão convertidos para Ativo.

## Detalhes técnicos
- Migração em `itens`: `unidade_medida text`, `codigo_barras text` (com índice), `fornecedor_id uuid` (referência a `fornecedores`, que fica vazio se o fornecedor for excluído), `custo_aquisicao numeric(14,2)`, `preco_venda numeric(14,2)`, `estoque_minimo numeric`, `estoque_maximo numeric`, `deposito`, `corredor` e `prateleira` como texto. `status` passa a ter o padrão 'ativo' e uma regra que só aceita ativo ou inativo; os valores atuais são normalizados antes da regra entrar em vigor.
- Os novos campos são registrados em `item_campos` como fixos e filtráveis quando fizer sentido (unidade, fornecedor, status, depósito).
- `src/lib/itens.ts`: amplia `CAMPOS_FIXOS` e o tipo `Item`, inclui o código de barras na busca e carrega o nome do fornecedor junto com o item.
- `ItemForm.tsx`: passa a cuidar também da edição, organizado em seções (Identificação, Comercial, Estoque, Localização).
- `ItemDetalhes.tsx`, `itens.tsx` (grade e cards), `FiltrosSheet.tsx`, `ExportarDialog.tsx` e `ImportarExcel.tsx`: ajustes para os novos campos e apelidos de colunas na importação ("UN", "EAN", "Custo", "Preço" etc.).
