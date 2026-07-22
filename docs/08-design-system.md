# 8. Design system — documento de referência

*Registro do que foi implementado a partir do [05-prompt-design-system.md](05-prompt-design-system.md).
Consulte junto com a vitrine viva em `apps/web/src/App.tsx` (`npm run dev` em `apps/web`).*

## Base técnica

shadcn/ui (estilo "Nova", base Radix) sobre Tailwind CSS v4, com tokens centralizados em
`apps/web/src/index.css` via CSS variables (`:root` / `.dark`) e mapeados em `@theme inline`.
Fonte: Geist Variable (`@fontsource-variable/geist`).

## 1. Paleta de cores

Base neutra do preset "Nova" do shadcn (cinzas em oklch) + azul Fluent como cor de destaque
para ações primárias, seguindo a referência visual pedida (Microsoft/Fluent):

| Token | Uso | Light | Dark |
|---|---|---|---|
| `--primary` | Ações primárias, foco, sidebar ativo | `oklch(0.526 0.149 251.6)` ≈ `#0F6CBD` | `oklch(0.686 0.153 251.1)` ≈ `#479EF5` |
| `--success` | Confirmação, estoque ok, pagamento confirmado | `oklch(0.475 0.153 142.7)` ≈ `#0E700E` | `oklch(0.679 0.156 143.6)` ≈ `#54B054` |
| `--warning` | Alerta não bloqueante (estoque baixo, trial acabando) | `oklch(0.68 0.198 43)` ≈ `#F7630C` | igual ao light |
| `--destructive` | Erro, ação irreversível | herdado do preset shadcn | herdado do preset shadcn |

Todos os pares cor/texto (`-foreground`) foram checados para contraste **AA** (mínimo 4.5:1
texto normal / 3:1 componentes) — ver critério 6 abaixo. Cores semânticas se usam via
composição de classe (ex.: `className="bg-success/10 text-success"`), sem alterar os
componentes gerados pelo shadcn (`badge.tsx`, `button.tsx` etc.), para manter compatibilidade
com atualizações futuras do CLI (`npx shadcn update`).

## 2. Tipografia

- Fonte única (heading + corpo): Geist Variable.
- Hierarquia usa as classes de tamanho padrão do Tailwind (`text-2xl` títulos de página,
  `text-base`/`text-sm` corpo, `text-xs` labels/metadados) — sem escala customizada por ora,
  já que o preset "Nova" cobre bem o que o MVP precisa.
- **Valores em R$**: sempre com a classe utilitária `tabular-nums` (dígitos de largura fixa),
  para colunas de preço/total alinharem em tabelas e resumos de venda. Ver
  `apps/web/src/lib/format.ts` (`formatarBRL`, `formatarQuantidade`) — helpers centrais que
  toda feature que exibe dinheiro/quantidade deve reusar, em vez de formatar na mão.

## 3. Componentes instalados (base para as features)

Primitivos shadcn já disponíveis em `apps/web/src/components/ui/`: `button`, `input`, `label`,
`card`, `dialog`, `table`, `badge`, `skeleton`, `separator`, `sonner` (toasts), `tooltip`,
`sidebar` (+ `sheet`, usado internamente pela sidebar em telas estreitas).

Componentes de produto específicos (teclado numérico de quantidade, card de item na venda,
modal de fechamento de venda, gráficos do dashboard) **não foram construídos agora** —
entram junto da feature que os usa (Fase 3), para não especular sobre uma UI que ainda não
foi desenhada em detalhe.

## 4. Padrões de estado

Toda tela deve tratar carregando / vazio / erro / sucesso. Componentes prontos em
`apps/web/src/components/estado/`:

- `EstadoCarregando` — spinner + texto, para carregamento de seção/página inteira. Para
  listas/tabelas com formato conhecido, prefira `<Skeleton />` no formato do conteúdo real.
- `EstadoVazio` — ícone + título + descrição + ação opcional (ex.: "Cadastrar produto").
- `EstadoErro` — ícone + mensagem + botão "Tentar novamente" opcional.
- **Sucesso**: não é um componente bloqueante — usa `toast.success(...)` (sonner), já
  conectado no root (`main.tsx`, `<Toaster />` + `<TooltipProvider />`).

## 5. Responsividade

Prioridade desktop. A `sidebar` do shadcn já traz o comportamento responsivo padrão
(colapsa para ícones / vira `sheet` em telas estreitas) — breakpoint mínimo tablet será
validado quando a navegação admin for construída (Fase 3), reusando esse componente em vez
de escrever um novo.

## 6. Acessibilidade básica

- Contraste AA verificado nos pares cor/texto de `--primary`, `--success`, `--warning`
  (script de conversão/checagem em Node, valores documentados na tabela acima).
- Foco visível: `--ring` usa a mesma cor primária (azul Fluent) em vez de um cinza genérico,
  deixando o foco de teclado consistente com a marca — herdado automaticamente por todos os
  componentes shadcn (`focus-visible:ring-ring/50`).
- Navegação por teclado da tela de venda: ainda não aplicável (tela não existe até a Fase 3);
  os primitivos Radix usados (dialog, tooltip, sidebar) já vêm com suporte a teclado por padrão.

## Verificação

- `npm run build` (typecheck + bundle) e `npm test` (Vitest) verdes em `apps/web`.
- Vitrine em `App.tsx` demonstra: botões (todas as variantes), card de produto com preço
  formatado, badges semânticas, e os 4 padrões de estado — usada como checagem visual manual
  até ser substituída pela primeira tela real.
