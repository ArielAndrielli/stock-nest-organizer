# Fase 2 — Autenticação, Histórico e QR Codes

## 1. Autenticação (item 7)

**Provedores:** Email/senha + Google (padrão Lovable Cloud). Auto-confirmação de email ativada para facilitar testes.

**Três papéis** (tabela `user_roles` separada com enum `app_role`, função `has_role` SECURITY DEFINER — padrão seguro):
- **Administrador** — acesso total (CRUD em setores/vagas/caixas, mover, gerenciar usuários).
- **Operador** — cadastrar, editar, mover caixas. Não exclui.
- **Visitante** — somente leitura.

**Primeiro usuário** que se cadastrar vira Administrador automaticamente (trigger). Demais entram como Visitante e o Admin promove pela tela `/admin/usuarios`.

**RLS reformulada** nas 4 tabelas existentes (hoje liberadas para `public`):
- SELECT: qualquer usuário autenticado.
- INSERT/UPDATE: Administrador ou Operador.
- DELETE: só Administrador.
- `movimentacoes_caixa` INSERT: Administrador ou Operador.

**Rotas:**
- `/auth` — login + cadastro (pública).
- Todo o resto passa para `src/routes/_authenticated/` (gate gerenciado pela integração, `ssr: false`, redireciona pra `/auth`).
- Header ganha avatar + menu com "Sair" e (se admin) link "Usuários".

**UI condicional:** botões de criar/editar/excluir/mover escondidos conforme o papel via hook `usePermissions()`. Visitante vê tudo em modo leitura.

## 2. Histórico de alterações (item 6)

Nova tabela `historico_eventos`:
- `id`, `criado_em`, `usuario_id`, `usuario_email`, `acao` (`criar|editar|excluir|mover|imagem`), `entidade` (`setor|vaga|caixa`), `entidade_id`, `entidade_nome`, `detalhes jsonb` (campos alterados, vaga origem/destino, etc).

Preenchida por **triggers** em `setores`, `vagas`, `caixas` e `movimentacoes_caixa` — captura automaticamente criação, edição (incluindo troca de imagem via diff em `imagem_url`), exclusão e movimentação. Sem depender do código da UI.

**Tela `/historico`** (todos autenticados podem ver):
- Timeline agrupada por dia, filtros por entidade, ação e usuário, busca por nome/id.
- Cada card mostra usuário, ação, entidade afetada e detalhes (ex.: "Caixa X movida de Vaga A → Vaga B", "Imagem trocada").

Também exibimos um mini-histórico ("Últimas alterações") no detalhe de cada Setor/Vaga/Caixa.

## 3. QR Codes e etiquetas (item 8)

Biblioteca: `qrcode.react` (SVG, sem dependências nativas) + `jsbarcode` para o código de barras (Code128 do id/código).

**QR code embutido** no card e no cabeçalho de cada detalhe (Setor/Vaga/Caixa). O conteúdo é a URL absoluta da própria página (`/setor/$id`, `/vaga/$id`, `/caixa/$id`) — ao escanear, abre direto o cadastro.

**Nova rota `/caixa/$id`** (faltava): mostra detalhe da caixa (necessário para o QR da caixa apontar pra algum lugar).

**Tela de impressão `/etiquetas`**:
- Seleção de itens (setores, vagas, caixas) com filtros por setor/vaga.
- Escolha do tamanho (pequena 40×30mm, média 60×40mm, grande A6).
- Cada etiqueta contém: **nome**, **QR Code** e **código de barras** (Code128).
- Layout em grid otimizado para papel A4, com `@media print` limpando cabeçalho/menu. Botão "Imprimir" chama `window.print()`.

## Fora do escopo desta fase

Nada — Fase 2 fecha os itens 6, 7 e 8, completando os 8 pontos originais.

## Detalhes técnicos

- Novas tabelas com GRANTs a `authenticated` e `service_role`; `anon` sem acesso.
- Função `has_role(_user_id uuid, _role app_role)` SECURITY DEFINER + trigger `handle_new_user` que cria linha em `profiles` e concede papel (`admin` se for o primeiro usuário, senão `visitante`).
- Reset das policies antigas `*_all` e criação das novas por papel.
- `src/lib/queries.ts` ganha hooks `useHistorico`, `useUsuarios`, `usePromoteUser`, `useCurrentRole`.
- `AppShell` passa a exigir sessão; adiciona menu de usuário e link "Histórico"/"Usuários"/"Etiquetas".
- Estilos de impressão em `src/styles.css` (`@media print { .no-print { display:none } }`).

Se aprovar, começo pela migração (auth + histórico + policies), depois telas de login/gate/roles, depois QR codes e etiquetas.
