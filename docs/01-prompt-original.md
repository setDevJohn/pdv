# 1. Prompt original

*Referência do pedido consolidado. Não precisa ser enviado ao agente de desenvolvimento.*

```
Atue como um Gerente de Projetos de Software sênior especializado em produtos SaaS de varejo.

Objetivo: estruturar o roteiro completo de desenvolvimento de um sistema PDV (frente de caixa) com
controle de estoque, voltado para pequenos comércios (bares, mini mercados, confeitarias).

Requisitos gerais:
- Produto intuitivo, rápido e completo o suficiente para competir com PDVs já validados no mercado
  (ex: MarketUP, Bling PDV, GestãoClick, Loyverse, Square).
- Estrutura de monorepo, com apps/serviços separados por responsabilidade.
- Dois perfis de acesso: Admin (acesso total) e Vendedor (venda + consultas de produto/estoque),
  com liberação de ações sensíveis por código de gerente configurado pelo Admin.
- Stack: Frontend React + Tailwind, Backend NestJS + Prisma, PostgreSQL. Sistema 100% online,
  responsivo com foco em desktop.
- Suporte a multiempresa (múltiplos estabelecimentos) desde a modelagem inicial.
- Pagamento via maquininha NÃO será integrado agora, mas o código deve ser desenhado para
  receber essa integração no futuro sem refatoração estrutural.
- UX/UI moderna, visual limpo, referência em design systems (Fluent/Microsoft, shadcn/ui).

Entregáveis esperados:
1. Pesquisa de mercado com PDVs validados (funcionalidades, planos e preços).
2. Proposta de planos e precificação do produto.
3. Prompt de metodologia de trabalho do agente de desenvolvimento (arquitetura limpa, manutenível).
4. Prompt de arquitetura do projeto (escopo, sprints/fases, critérios de aceite por feature e geral).
5. Prompt de design system (estilo Microsoft/Fluent, componentes shadcn).
6. Checklist de perguntas técnicas e de negócio para fechar o escopo do MVP.
7. Prompt para landing page institucional de venda do produto, em Next.js.

Antes de codar qualquer módulo, o agente deve justificar as decisões de arquitetura e aguardar
aprovação. Desenvolvimento feature por feature, com testes unitários entre features, código
comentado em trechos complexos e documentação contínua.
```
