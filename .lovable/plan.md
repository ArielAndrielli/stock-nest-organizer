# Aba de Calendário e Compromissos

Nova aba "Calendário" para agendar compromissos, além de um resumo do mês atual no Dashboard.

## O que será criado

### Banco de dados
Tabela `compromissos` com:
- título, descrição, data/hora de início, data/hora de fim (opcional), dia inteiro (sim/não)
- local (opcional), cor/categoria (ex.: produção, manutenção, reunião, entrega, outro)
- vínculo opcional com uma ordem de produção
- quem criou (usuário e e-mail)

Regras de acesso:
- Todos os usuários logados podem ver os compromissos
- Administradores e operadores podem criar e editar
- Somente administradores podem excluir

### Tela `/calendario`
- Grade mensal (seg–dom) com navegação mês anterior / próximo / "Hoje"
- Cada dia mostra os compromissos do dia como pequenas etiquetas coloridas; dias com mais itens mostram "+N"
- Clique em um dia: abre painel lateral com todos os compromissos daquele dia e botão "Novo compromisso" já com a data preenchida
- Clique em um compromisso: abre detalhes com editar/excluir (conforme permissão)
- Alternância entre visão "Mês" e visão "Lista" (próximos compromissos em ordem cronológica)
- Filtro por categoria

### Formulário de compromisso
Diálogo com título, descrição, data e hora de início/fim, opção "dia inteiro", local, categoria/cor e vínculo opcional a uma OP (busca por número/referência).

### Dashboard
Novo bloco "Agenda do mês":
- Mini calendário do mês atual com marcação nos dias que possuem compromissos
- Lista lateral dos compromissos do mês (próximos primeiro), com data, hora, título e cor da categoria
- Clique leva para `/calendario`

### Navegação
Link "Calendário" no menu principal do AppShell.

## Detalhes técnicos
- Migração SQL criando `public.compromissos` com GRANTs, RLS usando `pode_editar()` / `has_role()`, trigger `set_atualizado_em` e índice por `inicio`
- `src/lib/compromissos.ts`: hooks React Query (listar por intervalo de mês, criar, atualizar, excluir)
- `src/routes/_authenticated/calendario.tsx`: grade mensal própria (cálculo de semanas com date-fns), painel de dia via Sheet, diálogo de formulário
- `src/components/calendario/CompromissoDialog.tsx`: formulário reutilizado no calendário e no dashboard
- `src/components/calendario/AgendaMes.tsx`: bloco do dashboard, incluído em `src/routes/_authenticated/index.tsx`
- Cores das categorias via tokens do design system existente; head() com título e descrição próprios na rota nova
