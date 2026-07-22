import * as React from 'react'
import { cn } from '@/lib/utils'

// Select nativo estilizado como o Input do design system — evita puxar o
// componente de Select do Radix para um caso simples (escolher categoria).
export function NativeSelect({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30',
        className,
      )}
      {...props}
    />
  )
}
