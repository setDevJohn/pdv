# 6. Prompts de apoio

*Usados quando chegar a hora de cada frente específica — não precisam ser disparados todos
de uma vez com a arquitetura.*

## 6.1 Prompt — Modelagem de dados
```
Modele o schema Prisma completo do sistema PDV cobrindo: empresas (multiempresa), usuários e
perfis de acesso, produtos, categorias, estoque e movimentações, vendas, itens de venda,
formas de pagamento por venda, caixa/sangria, e log de auditoria de ações sensíveis.
Para cada entidade, defina os relacionamentos, índices necessários para consultas de venda em
tempo real, e estratégia de isolamento de dados entre empresas (schema único com tenant_id vs.
schema por tenant) — justifique a escolha considerando custo de infraestrutura para pequenos
comércios.
```

## 6.2 Prompt — Segurança e permissões
```
Defina a matriz de permissões do sistema (Admin, Vendedor, ação liberada por código de gerente)
por tela e por ação (criar, editar, excluir, visualizar). Defina estratégia de autenticação
(JWT/sessão), expiração, e como o código de gerente é validado sem expor credenciais de Admin
na tela de venda. Inclua auditoria: quais ações ficam registradas com usuário, data/hora e
valor alterado.
```

## 6.3 Prompt — QA e testes
```
Defina a estratégia de testes do projeto: unitários (regras de negócio de estoque, cálculo de
troco e totais), integração (fluxo completo de venda), e critérios de cobertura mínima por
módulo crítico (venda, estoque, caixa). Defina também um checklist de testes manuais de UX
para a tela de frente de caixa antes de cada release.
```
