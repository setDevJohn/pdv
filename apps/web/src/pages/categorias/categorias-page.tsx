import { useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { PencilIcon, Trash2Icon, CheckIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { EstadoErro, EstadoVazio } from '@/components/estado'
import {
  useAtualizarCategoria,
  useCategorias,
  useCriarCategoria,
  useRemoverCategoria,
} from '@/hooks/use-categorias'

export function CategoriasPage() {
  const { data: categorias, isPending, isError, refetch } = useCategorias()
  const criar = useCriarCategoria()
  const atualizar = useAtualizarCategoria()
  const remover = useRemoverCategoria()

  const [novoNome, setNovoNome] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [nomeEditado, setNomeEditado] = useState('')

  function erroConflito(erro: unknown) {
    if (isAxiosError(erro) && erro.response?.status === 409) {
      toast.error('Já existe uma categoria com esse nome.')
    } else {
      toast.error('Não foi possível concluir a operação.')
    }
  }

  function aoCriar(evento: FormEvent) {
    evento.preventDefault()
    const nome = novoNome.trim()
    if (!nome) return
    criar.mutate(nome, {
      onSuccess: () => {
        setNovoNome('')
        toast.success('Categoria criada.')
      },
      onError: erroConflito,
    })
  }

  function aoSalvarEdicao(id: string) {
    const nome = nomeEditado.trim()
    if (!nome) return
    atualizar.mutate(
      { id, nome },
      {
        onSuccess: () => {
          setEditandoId(null)
          toast.success('Categoria atualizada.')
        },
        onError: erroConflito,
      },
    )
  }

  function aoRemover(id: string) {
    remover.mutate(id, {
      onSuccess: () => toast.success('Categoria removida.'),
      onError: () => toast.error('Não foi possível remover a categoria.'),
    })
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="font-heading text-xl font-semibold">Categorias</h1>
        <p className="text-sm text-muted-foreground">Organize seus produtos por categoria.</p>
      </div>

      <form className="flex gap-2" onSubmit={aoCriar}>
        <Input placeholder="Nova categoria" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
        <Button type="submit" disabled={criar.isPending || !novoNome.trim()}>
          Adicionar
        </Button>
      </form>

      {isError ? (
        <EstadoErro aoTentarNovamente={() => refetch()} />
      ) : isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : categorias.length === 0 ? (
        <EstadoVazio titulo="Nenhuma categoria" descricao="Crie a primeira categoria acima." />
      ) : (
        <ul className="divide-y rounded-lg ring-1 ring-foreground/10">
          {categorias.map((categoria) => (
            <li key={categoria.id} className="flex items-center justify-between gap-2 px-3 py-2">
              {editandoId === categoria.id ? (
                <>
                  <Input
                    className="h-7"
                    value={nomeEditado}
                    onChange={(e) => setNomeEditado(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-1">
                    <Button size="icon-sm" variant="ghost" aria-label="Salvar" onClick={() => aoSalvarEdicao(categoria.id)}>
                      <CheckIcon />
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label="Cancelar" onClick={() => setEditandoId(null)}>
                      <XIcon />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-sm">{categoria.nome}</span>
                  <div className="flex gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Editar"
                      onClick={() => {
                        setEditandoId(categoria.id)
                        setNomeEditado(categoria.nome)
                      }}
                    >
                      <PencilIcon />
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label="Remover" onClick={() => aoRemover(categoria.id)}>
                      <Trash2Icon />
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
