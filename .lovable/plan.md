# Corrigir importação de fornecedores e aceitar CPF/outros documentos

## Problema encontrado (confirmado)

O erro "CASE types text and bigint cannot be matched" vem do registro automático de histórico. Essa rotina monta o nome do registro com uma comparação que mistura texto e número; como fornecedores agora têm um Código numérico, qualquer gravação (manual ou por planilha) na tabela de fornecedores falha. Ou seja: hoje a importação de fornecedores está totalmente bloqueada por isso.

## O que será feito

### 1. Destravar a gravação de fornecedores
- Ajustar a rotina de histórico para sempre converter o nome do registro em texto, mantendo o mesmo comportamento para setores, vagas, caixas e itens.
- Com isso, cadastro manual, edição, exclusão e importação de fornecedores voltam a funcionar e continuam sendo registrados no Histórico.

### 2. Aceitar CNPJ, CPF ou outro documento
- O campo CNPJ passa a aceitar de 1 até 20 dígitos, em vez de exigir exatamente 14.
- No formulário: aviso apenas se passar de 20 dígitos.
- Na importação: a linha só é recusada se o documento tiver mais de 20 dígitos; documentos com 11 dígitos (CPF) ou outros tamanhos são aceitos normalmente.
- A verificação de registros já existentes passa a considerar qualquer documento com 1 a 20 dígitos, não só os de 14 — assim registros com CPF são atualizados em vez de duplicados.
- Exibição: continua formatado como CNPJ quando tiver 14 dígitos, formatado como CPF quando tiver 11, e exibido apenas com os números nos demais casos.

## Detalhes técnicos

- Migração: `CREATE OR REPLACE FUNCTION public.log_historico()` trocando `CASE v_entidade WHEN 'vaga' THEN NEW.codigo ELSE NEW.nome END` por uma versão com `::text` explícito nos dois braços (INSERT, UPDATE e DELETE).
- `src/lib/fornecedores.ts`: nova constante de limite (20), helper `documentoValido` e `formatarDocumento` (14 → CNPJ, 11 → CPF, restante → dígitos); `buscarCnpjsExistentes` sem o filtro fixo de 14 dígitos.
- `src/components/fornecedores/FornecedorDialog.tsx`: validação `cnpj.length > 20` em vez de `!== 14`.
- `src/components/fornecedores/ImportarFornecedores.tsx`: erro de linha só quando exceder 20 dígitos; `irParaPrevia` coletando documentos com `length >= 1 && length <= 20`.
- `src/routes/_authenticated/fornecedores.tsx`: usar `formatarDocumento` na coluna do documento.
