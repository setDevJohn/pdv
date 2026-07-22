# 7. Escopo fechado

*Bloco de decisões já tomadas — cole junto do prompt de arquitetura para o agente não
perguntar de novo o que já foi decidido.*

- Cobrança: planos mensal/trimestral/anual, com múltiplas lojas somando valor no mesmo plano
  (com desconto); trial de 7 dias com inserções limitadas.
- Cadastro de cliente (fiado/fidelidade): fora do MVP.
- Cancelamento de venda finalizada: exige aprovação do gerente.
- Caixa: abertura com valor inicial declarado + sangria.
- Leitora de código de barras: USB/Bluetooth via HID (sem SDK específico).
- Produtos com variação (tamanho/sabor): entram no MVP.
- Venda por peso/volume: fora do MVP, mas modelagem preparada para isso.
- Exportação de relatórios: Excel como prioridade.
- Integração futura de pagamento: provável API de adquirente (Stone/Cielo/GetNet/PagSeguro).
- Comissão de vendedor: não terá.
- Volume esperado por loja: médio (dezenas a centenas de vendas/dia) — dimensiona índices e
  estratégia de paginação/consulta no banco.
- Deploy: VPS próprio.
- Impressora térmica: integração via WebUSB, direto no navegador, sem serviço local instalado.
- Regime tributário do público-alvo: misto (Simples Nacional e MEI) — a modelagem fiscal futura
  precisa suportar as regras de ambos os regimes.
- Infraestrutura: Dockerfile por serviço + docker-compose.yml na raiz do monorepo.
- Commits: um commit por feature concluída, sempre após atualizar o CHANGELOG.md.
