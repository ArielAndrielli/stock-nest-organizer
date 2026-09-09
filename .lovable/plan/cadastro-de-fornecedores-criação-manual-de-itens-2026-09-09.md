# Cadastro de Fornecedores + criação manual de itens

## O que será entregue

### 1. Nova aba "Fornecedores"
- Item novo no menu lateral, com tela em grade (tabela), busca por texto e paginação, no mesmo estilo da tela de Itens.
- Botão "Novo fornecedor" abre um formulário com: nome, CNPJ, telefone, e-mail, cidade, UF, observações, além de qualquer campo extra criado pela importação.
- Cada linha permite ver detalhes, editar e excluir (excluir somente para administrador, como no restante do sistema).

### 2. Importação de planilha de fornecedores
- Mesmo fluxo já usado em Itens: enviar arquivo, relacionar colunas aos campos, validar, conferir prévia e confirmar.
- Colunas não reconhecidas viram campos livres do fornecedor, criados automaticamente.
- Chave de identificação: CNPJ quando existir; caso contrário, o nome. Registros já existentes são atualizados; duplicados e linhas sem identificação aparecem no relatório de erros para download.

### 3. Cadastro manual de itens
- Botão "Novo item" na tela de Itens, com formulário contendo os campos fixos (código interno, referência, descrição, marca, setor, tipo, status, imagem) e os campos adicionais existentes.
- Código interno é sugerido automaticamente (próximo número livre) e pode ser alterado; aviso caso já exista.
- Mesmo formulário reaproveitado para edição do item.

## Detalhes técnicos

- Migração: tabelas `fornecedores` (nome, cnpj único, telefone, email, cidade, uf, observacoes, extras jsonb, timestamps) e `fornecedor_campos` (espelhando `item_campos`), com GRANTs, RLS nos mesmos moldes de `itens` (leitura para autenticados, escrita via `pode_editar`, exclusão para administrador), trigger `set_atualizado_em` e trigger de histórico.
- `src/lib/fornecedores.ts`: hooks de listagem/paginação/busca, campos, criação, atualização, exclusão, `buscarCnpjsExistentes` e `upsertLote`, espelhando `src/lib/itens.ts`.
- `src/components/fornecedores/ImportarFornecedores.tsx`: baseado em `ImportarExcel.tsx`, com validação por CNPJ/nome.
- `src/components/fornecedores/FornecedorDialog.tsx`: formulário de criação/edição.
- `src/routes/_authenticated/fornecedores.tsx`: grade, busca, paginação, ações; link adicionado em `AppSidebar.tsx`.
- `src/lib/itens.ts`: novo `useCriarItem` e `proximoCodigoInterno`; `src/components/itens/ItemForm.tsx` usado por criar/editar em `itens.tsx`.
