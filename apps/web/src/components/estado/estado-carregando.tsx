import { Loader2Icon } from 'lucide-react'
import { cn } from '@/lib/utils'

// Estado de carregamento para seções/páginas inteiras (ex.: primeira busca de
// dados). Para linhas de tabela/listas já com layout conhecido, prefira o
// componente <Skeleton /> no formato do conteúdo real, que passa a sensação
// de carregamento mais rápido do que um spinner central.
export function EstadoCarregando({ mensagem = 'Carregando...', className }: { mensagem?: string; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground', className)}>
      <Loader2Icon className="size-5 animate-spin" aria-hidden="true" />
      <p className="text-sm">{mensagem}</p>
    </div>
  )
}
