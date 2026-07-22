# 4. Prompt — Arquitetura do projeto

*O pedido de trabalho em si. Enviar depois do prompt de metodologia, para o agente montar o
plano técnico e começar a construir feature por feature.*

```
Estruture a arquitetura técnica do projeto PDV com base nas definições abaixo.

Stack: React + Tailwind (frontend), NestJS + Prisma (backend), PostgreSQL (banco).
Estrutura: monorepo, com pastas/apps separados por responsabilidade (ex: apps/web,
apps/api, packages/shared-types, packages/ui).

Infraestrutura local/deploy: cada serviço do monorepo (web, api, banco) deve ter seu próprio
Dockerfile, com um docker-compose.yml na raiz orquestrando tudo para rodar o ambiente completo
localmente com um único comando. Isso também facilita o deploy em VPS próprio.

Escopo do MVP (todas as features abaixo compõem o MVP):
- Autenticação com dois perfis: Admin e Vendedor, mais código de gerente para liberar ações
  restritas na tela de venda (inclui aprovação de cancelamento de venda já finalizada).
- Tela de frente de caixa: leitura de código de barras via USB/Bluetooth simulando teclado
  (HID), adição/remoção de itens, ajuste de quantidade, cálculo automático de total, baixa
  automática de estoque. Venda apenas por unidade no MVP, mas modelagem de produto já
  preparada para venda por peso/volume (kg, litro) no futuro.
- Produtos com variação (tamanho, sabor) fazem parte do MVP.
- Caixa: abertura com valor inicial declarado + sangria manual ao longo do turno.
- Pagamento: divisão entre dinheiro, cartão e Pix, confirmação manual pelo operador, controle
  de troco vinculado ao caixa/sangria. Estrutura de código pronta para integração futura com
  maquininha via API de adquirente (Stone/Cielo/GetNet/PagSeguro) — decisão final em aberto,
  mas a abstração deve favorecer esse caminho.
- Estoque: cadastro de produtos, entrada/saída, alertas de ruptura, histórico de movimentação.
- Multiempresa: um mesmo sistema deve suportar múltiplos estabelecimentos com dados isolados.
  Cobrança por loja: planos mensal/trimestral/anual, com opção de somar mais de uma loja no
  mesmo plano com desconto. Trial gratuito de 7 dias com inserções limitadas.
- Dashboard: vendas por dia/semana/mês, produtos mais vendidos, relatórios de estoque,
  exportação de relatórios priorizando Excel.
- Recibo opcional via impressora térmica, integrada via WebUSB direto no navegador.
- Fora do MVP: cadastro de cliente (fiado/fidelidade), controle de comissão de vendedor,
  emissão fiscal (regime tributário do público-alvo é misto: Simples Nacional e MEI — a
  modelagem futura precisa suportar ambos).

Volume esperado: médio (dezenas a centenas de vendas/dia por loja) — dimensione índices e
estratégia de paginação/consulta no banco para esse patamar. Deploy em VPS próprio.

Para cada feature, defina:
1. Escopo exato (o que entra e o que fica fora do MVP).
2. Modelagem de dados envolvida (entidades e relacionamentos).
3. Fluxo principal e fluxos de erro/exceção.
4. Critérios de aceite objetivos e testáveis.

Ao final, defina também o critério de aceite do projeto completo (MVP pronto para primeiro
cliente piloto).

Justifique decisões de arquitetura (ex: por que determinado padrão de isolamento multiempresa,
estratégia de cache, estrutura de filas se houver) antes de detalhar a implementação.
```
