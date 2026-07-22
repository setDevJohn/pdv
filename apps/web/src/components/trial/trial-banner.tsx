import { InfoIcon, TriangleAlertIcon } from 'lucide-react'
import { useAssinatura } from '@/hooks/use-assinatura'
import { montarConteudoTrial, type NivelTrial } from './trial-banner-content'
import { cn } from '@/lib/utils'

const estiloPorNivel: Record<NivelTrial, string> = {
  info: 'bg-primary/10 text-foreground',
  alerta: 'bg-warning/15 text-foreground',
  expirado: 'bg-destructive/10 text-foreground',
}

export function TrialBanner() {
  const { data } = useAssinatura()
  if (!data) {
    return null
  }

  const conteudo = montarConteudoTrial(data)
  if (!conteudo) {
    return null
  }

  const Icone = conteudo.nivel === 'info' ? InfoIcon : TriangleAlertIcon

  return (
    <div
      role="status"
      className={cn('flex items-start gap-3 rounded-lg px-4 py-3', estiloPorNivel[conteudo.nivel])}
    >
      <Icone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{conteudo.titulo}</p>
        <p className="text-sm text-muted-foreground">{conteudo.descricao}</p>
      </div>
    </div>
  )
}
