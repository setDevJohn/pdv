import type { LucideIcon } from 'lucide-react'
import { InboxIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EstadoVazioProps {
  titulo: string
  descricao?: string
  icone?: LucideIcon
  acao?: { label: string; onClick: () => void }
  className?: string
}

// Estado vazio: nenhum dado ainda (lista sem itens, busca sem resultado).
// Sempre com uma ação clara quando fizer sentido ("Cadastrar produto"), para
// não deixar o usuário sem próximo passo.
export function EstadoVazio({ titulo, descricao, icone: Icone = InboxIcon, acao, className }: EstadoVazioProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-12 text-center', className)}>
      <Icone className="size-8 text-muted-foreground" aria-hidden="true" />
      <div className="space-y-1">
        <p className="text-sm font-medium">{titulo}</p>
        {descricao && <p className="text-sm text-muted-foreground">{descricao}</p>}
      </div>
      {acao && (
        <Button size="sm" onClick={acao.onClick}>
          {acao.label}
        </Button>
      )}
    </div>
  )
}
