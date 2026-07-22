import { TriangleAlertIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EstadoErroProps {
  titulo?: string
  descricao?: string
  aoTentarNovamente?: () => void
  className?: string
}

// Estado de erro: falha ao carregar dados (rede, servidor). Erros de
// validação de formulário são tratados inline no próprio campo, não aqui.
export function EstadoErro({
  titulo = 'Não foi possível carregar os dados',
  descricao,
  aoTentarNovamente,
  className,
}: EstadoErroProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-12 text-center', className)}>
      <TriangleAlertIcon className="size-8 text-destructive" aria-hidden="true" />
      <div className="space-y-1">
        <p className="text-sm font-medium">{titulo}</p>
        {descricao && <p className="text-sm text-muted-foreground">{descricao}</p>}
      </div>
      {aoTentarNovamente && (
        <Button size="sm" variant="outline" onClick={aoTentarNovamente}>
          Tentar novamente
        </Button>
      )}
    </div>
  )
}
