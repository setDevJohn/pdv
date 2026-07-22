import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { ArrowLeftIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Card, CardContent } from '@/components/ui/card'
import { useCategorias } from '@/hooks/use-categorias'
import { useCriarProduto } from '@/hooks/use-produtos'
import { formatarBRL } from '@/lib/format'
import { VariacaoDialog, type VariacaoFormValor } from './variacao-dialog'

export function ProdutoNovoPage() {
  const navigate = useNavigate()
  const { data: categorias } = useCategorias()
  const criar = useCriarProduto()

  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [variacoes, setVariacoes] = useState<VariacaoFormValor[]>([])
  const [dialogAberto, setDialogAberto] = useState(false)
  const [editandoIndex, setEditandoIndex] = useState<number | null>(null)

  function aoSalvarVariacao(valor: VariacaoFormValor) {
    setVariacoes((atual) => {
      if (editandoIndex === null) return [...atual, valor]
      return atual.map((v, i) => (i === editandoIndex ? valor : v))
    })
    setDialogAberto(false)
    setEditandoIndex(null)
  }

  function abrirNova() {
    setEditandoIndex(null)
    setDialogAberto(true)
  }

  function abrirEdicao(index: number) {
    setEditandoIndex(index)
    setDialogAberto(true)
  }

  function aoSubmeter(evento: FormEvent) {
    evento.preventDefault()
    if (variacoes.length === 0) {
      toast.error('Adicione ao menos uma variação (com preço).')
      return
    }
    criar.mutate(
      {
        nome: nome.trim(),
        descricao: descricao.trim() || undefined,
        categoriaId: categoriaId || undefined,
        variacoes,
      },
      {
        onSuccess: () => {
          toast.success('Produto cadastrado.')
          navigate('/produtos')
        },
        onError: (erro) => {
          if (isAxiosError(erro) && erro.response?.status === 409) {
            toast.error('Código de barras já cadastrado em outra variação.')
          } else if (isAxiosError(erro) && erro.response?.status === 403) {
            toast.error('Limite do período de teste atingido. Assine um plano para continuar.')
          } else {
            toast.error('Não foi possível cadastrar o produto.')
          }
        },
      },
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate('/produtos')}>
        <ArrowLeftIcon />
        Voltar
      </Button>
      <h1 className="font-heading text-xl font-semibold">Novo produto</h1>

      <form className="space-y-4" onSubmit={aoSubmeter}>
        <div className="space-y-1.5">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="descricao">Descrição (opcional)</Label>
          <Input id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="categoria">Categoria (opcional)</Label>
          <NativeSelect id="categoria" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
            <option value="">Sem categoria</option>
            {categorias?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Variações</Label>
            <Button type="button" variant="outline" size="sm" onClick={abrirNova}>
              <PlusIcon />
              Adicionar variação
            </Button>
          </div>
          {variacoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma variação. Um produto simples tem uma variação "Padrão" com o preço.
            </p>
          ) : (
            <div className="space-y-2">
              {variacoes.map((v, i) => (
                <Card key={i} size="sm">
                  <CardContent className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{v.nome}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {formatarBRL(v.precoVenda)}
                        {v.codigoBarras ? ` · ${v.codigoBarras}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" size="icon-sm" onClick={() => abrirEdicao(i)} aria-label="Editar variação">
                        <PencilIcon />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setVariacoes((atual) => atual.filter((_, idx) => idx !== i))}
                        aria-label="Remover variação"
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/produtos')}>
            Cancelar
          </Button>
          <Button type="submit" disabled={criar.isPending}>
            {criar.isPending ? 'Salvando...' : 'Cadastrar produto'}
          </Button>
        </div>
      </form>

      <VariacaoDialog
        aberto={dialogAberto}
        aoFechar={() => {
          setDialogAberto(false)
          setEditandoIndex(null)
        }}
        aoSalvar={aoSalvarVariacao}
        titulo={editandoIndex === null ? 'Adicionar variação' : 'Editar variação'}
        inicial={editandoIndex === null ? undefined : variacoes[editandoIndex]}
      />
    </div>
  )
}
