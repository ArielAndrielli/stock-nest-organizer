# Continuação: detalhe da ordem, menu e ajustes na tela de Itens

## 1. Tela de detalhe da Ordem de Produção

Nova rota `/ordem/$id` com:

- Cabeçalho: nº da ordem, referência, produto, quantidade, status atual (badge colorido), quem criou e data.
- Alteração de status pelo fluxo definido (aguardando separação → em separação → separação concluída → concluído, com opção de cancelar). Somente operador/administrador altera; visitante apenas vê.
- Lista de materiais da ordem (tipo, referência, descrição, quantidade), com adicionar/editar/remover buscando itens do Cadastro de Itens.
- Exclusão da ordem disponível apenas para administrador, com confirmação.
- Botão de voltar para a lista de ordens.

## 2. Link "Ordens" no menu

Entrada "Ordens" no cabeçalho, entre Itens e Histórico, apontando para a tela de ordens.

## 3. Tela de Itens

- **Preferências**: a troca grade/cards passa a valer na hora (estado local). Botões "Salvar preferências" (grava modo, colunas visíveis e registros por página) e "Restaurar padrão", com aviso de sucesso/erro.
- **Registros por página**: seletor com 10, 25, 50, 100 e 200 ao lado da paginação; volta para a página 1 ao mudar e entra nas preferências salvas.
- **Exportação**: o botão "Exportar" abre um diálogo com duas escolhas — abrangência (página atual ou todos os registros do filtro/busca, baixados em lotes com indicador de progresso) e colunas (apenas as visíveis ou todos os campos).

## Detalhes técnicos

- `src/routes/_authenticated/ordem.$id.tsx` usando `useOrdem`, `useAtualizarStatus`, `useAtualizarMateriais`, `useExcluirOrdem` de `src/lib/ordens.ts`; permissões via `useMyRole`. `head()` próprio com título/descrição.
- `AppShell.tsx`: novo `NavLink` para `/ordens` com ícone `ClipboardList`/`Factory`.
- `src/routes/_authenticated/itens.tsx`: estado local de prefs sincronizado com `usePrefs`, `useSavePrefs` chamado só no botão salvar; `POR_PAGINA` substituído por `porPagina` do estado; novo componente `src/components/itens/ExportarDialog.tsx` usando `buscarTodosItens` e XLSX.
- Sem migrações de banco: `por_pagina` já existe.
