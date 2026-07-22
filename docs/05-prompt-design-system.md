# 5. Prompt — Design system

*Complementa a arquitetura, focado na parte visual/componentes. Define o essencial (tokens)
e deixa o agente implementar os componentes em código sobre essa base.*

```
Crie o design system do produto PDV seguindo estas diretrizes:

Referência visual: linguagem limpa e profissional no estilo dos sites/produtos da Microsoft
(Fluent Design) — hierarquia tipográfica clara, uso generoso de espaço em branco, cantos
levemente arredondados, paleta neutra com uma cor de destaque para ações primárias.

Base técnica: componentes shadcn/ui sobre Tailwind, com tokens de design centralizados
(cores, espaçamento, tipografia, elevação/sombra, raio de borda) em variáveis reutilizáveis.

Defina:
1. Paleta de cores (base neutra + cor primária de marca + cores semânticas: sucesso, alerta, erro).
2. Escala tipográfica (títulos, corpo, labels, dados numéricos de destaque para valores em R$).
3. Componentes prioritários para o MVP: tabela de produtos, card de produto na venda, teclado
   numérico de quantidade, modal de fechamento de venda, sidebar de navegação admin,
   componentes de gráfico do dashboard.
4. Padrões de estado: loading, vazio, erro, sucesso — cada tela do sistema deve tratar os 4.
5. Responsividade: prioridade desktop, mas define breakpoints mínimos para tablet (uso comum
   em caixas físicos).
6. Acessibilidade básica: contraste mínimo AA, foco visível, navegação por teclado na tela de
   venda (fluxo rápido sem depender só do mouse).

Entregue o design system como documento de referência + exemplos de componentes-chave
implementados com shadcn/ui.
```
