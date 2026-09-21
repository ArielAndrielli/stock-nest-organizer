# Plano: Pré-Entrada de Mercadorias e Controle de Estoque

## Objetivo
Criar uma nova tela completa para simular o fluxo de transformar uma Nota Fiscal em rascunho de entrada de estoque, com aparência limpa, moderna e profissional.

## O que será entregue
- Nova aba no menu lateral: **Pré-Entrada**.
- Nova tela protegida para usuários logados.
- Fluxo interativo sem alterar o estoque real por enquanto, usando dados simulados para validação visual e de usabilidade.
- Correção silenciosa do erro de carregamento/hidratação detectado na tela de login.

## Estrutura da tela

### 1. Barra de captura no topo
- Campo grande para **“Bipar Chave de Acesso da NF (44 dígitos) ou ler QR Code”**.
- Botão **“Simular Leitura”** para preencher a nota e os itens de exemplo.
- Área/botão para **Upload de Arquivo XML**.
- Botão secundário **“Importar Notas da SEFAZ”**.

### 2. Visualização do rascunho
Após simular a leitura ou upload:
- Cabeçalho com Número da NF, Data de Emissão, Fornecedor, CNPJ/documento, Valor Total e Status **“Em Análise”**.
- Banner discreto quando o fornecedor for novo, com botão **“Cadastrar Automaticamente”**.
- Ação simulada de cadastro automático, atualizando o estado visual do fornecedor.

### 3. Tabela de itens da nota
Tabela responsiva com linhas de exemplo cobrindo os três cenários solicitados:
- **Pronto**: produto vinculado automaticamente via EAN.
- **Vincular**: produto sem vínculo, com seleção manual do produto interno.
- **Novo Produto**: item inexistente no estoque, com botão **“Cadastrar”** na linha.

Colunas:
- Produto na Nota
- Código de Barras / EAN
- Produto Interno
- Qtd. na Nota
- Unidade
- Fator de Conversão
- Qtd. Final Estoque
- Status do Vínculo

### 4. Interações
- Alterar o **Fator de Conversão** recalcula a **Qtd. Final Estoque** em tempo real.
- Selecionar um produto interno muda o status da linha para pronto.
- Clicar em **“Cadastrar”** abre um modal de cadastro rápido com Categoria e Preço de Venda.
- Ao salvar o cadastro rápido, a linha passa a aparecer como vinculada/pronta.
- Toasts para salvar rascunho, cancelar, cadastro automático e confirmação final.

### 5. Ações finais
Rodapé da tela alinhado à direita com:
- **Salvar Rascunho**: mantém o rascunho atual na tela e mostra confirmação.
- **Cancelar**: limpa a nota simulada e volta ao estado inicial.
- **Confirmar Entrada no Estoque**: mostra a mensagem:  
  **“Sucesso! X itens adicionados ao estoque e contas a pagar gerado”.**

## Direção visual
- Estilo SaaS premium: cinzas, azul principal e badges coloridos apenas para status.
- Cartões e tabela com bom espaçamento, bordas sutis e leitura fácil.
- Inputs e botões grandes o suficiente para uso confortável.
- Layout responsivo, com rolagem horizontal controlada na tabela em telas menores.

## Detalhes técnicos
- Criar a rota `/pre-entrada` com metadados próprios da página.
- Reaproveitar os componentes visuais existentes: botões, inputs, seleção, badges, modal e toast.
- Atualizar o menu lateral com a nova aba.
- Manter os dados da simulação em estado local da tela; nenhuma entrada real será gravada no estoque nesta etapa.
- Ajustar a tela de login para evitar diferença entre o conteúdo renderizado inicialmente e o conteúdo exibido no navegador.
