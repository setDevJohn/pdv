import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { ArrowLeftIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { NativeSelect } from '@/components/ui/native-select'
import { Card, CardContent } from '@/components/ui/card'
import { EstadoCarregando, EstadoErro } from '@/components/estado'
import { useCategorias } from '@/hooks/use-categorias'
import {
  useAdicionarVariacao,
  useAtualizarProduto,
  useAtualizarVariacao,
  useProduto,
  useRemoverProduto,
  useRemoverVariacao,
} from '@/hooks/use-produtos'
import { formatarBRL, formatarQuantidade } from '@/lib/format'
import type { Variacao } from '@/services/produtos-service'
import { VariacaoDialog, type VariacaoFormValor } from './variacao-dialog'

export function ProdutoEditarPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: produto, isPending, isError, refetch } = useProduto(id)
  const { data: categorias } = useCategorias()

  const atualizar = useAtualizarProduto(id)
  const adicionarVariacao = useAdicionarVariacao(id)
  const atualizarVariacao = useAtualizarVariacao(id)
  const removerVariacao = useRemoverVariacao(id)
  const remover = useRemoverProduto()

  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [dialogAberto, setDialogAberto] = useState(false)
  const [variacaoEmEdicao, setVariacaoEmEdicao] = useState<Variacao | null>(null)

  useEffect(() => {
    if (produto) {
      setNome(produto.nome)
      setDescricao(produto.descricao ?? '')
      setCategoriaId(produto.categoriaId ?? '')
    }
  }, [produto])

  if (isPending) return <EstadoCarregando />
  if (isError || !produto) return <EstadoErro aoTentarNovamente={() => refetch()} />

  const variacoesAtivas = produto.variacoes.filter((v) => v.ativo)

  function aoSalvarProduto(evento: FormEvent) {
    evento.preventDefault()
    atualizar.mutate(
      { nome: nome.trim(), descricao: descricao.trim() || undefined, categoriaId: categoriaId || null },
      {
        onSuccess: () => toast.success('Produto atualizado.'),
        onError: () => toast.error('Não foi possível salvar as alterações.'),
      },
    )
  }

  function tratarErroVariacao(erro: unknown) {
    if (isAxiosError(erro) && erro.response?.status === 409) {
      toast.error('Código de barras já cadastrado em outra variação.')
    } else if (isAxiosError(erro) && erro.response?.status === 400) {
      toast.error('Não é possível remover a última variação do produto.')
    } else {
      toast.error('Não foi possível salvar a variação.')
    }
  }

  function aoSalvarVariacao(valor: VariacaoFormValor) {
    if (variacaoEmEdicao) {
      atualizarVariacao.mutate(
        { variacaoId: variacaoEmEdicao.id, input: valor },
        {
          onSuccess: () => {
            toast.success('Variação atualizada.')
            setDialogAberto(false)
            setVariacaoEmEdicao(null)
          },
          onError: tratarErroVariacao,
        },
      )
    } else {
      adicionarVariacao.mutate(valor, {
        onSuccess: () => {
          toast.success('Variação adicionada.')
          setDialogAberto(false)
        },
        onError: tratarErroVariacao,
      })
    }
  }

  function aoRemoverVariacao(variacaoId: string) {
    removerVariacao.mutate(variacaoId, {
      onSuccess: () => toast.success('Variação removida.'),
      onError: tratarErroVariacao,
    })
  }

  function aoDesativarProduto() {
    remover.mutate(produto!.id, {
      onSuccess: () => {
        toast.success('Produto desativado.')
        navigate('/produtos')
      },
      onError: () => toast.error('Não foi possível desativar o produto.'),
    })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/produtos')}>
        <ArrowLeftIcon />
        Voltar
      </Button>
      <h1 className="font-heading text-xl font-semibold">Editar produto</h1>

      <form className="space-y-4" onSubmit={aoSalvarProduto}>
        <div className="space-y-1.5">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="descricao">Descrição</Label>
          <Input id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="categoria">Categoria</Label>
          <NativeSelect id="categoria" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
            <option value="">Sem categoria</option>
            {categorias?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={atualizar.isPending}>
            {atualizar.isPending ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </div>
      </form>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-medium">Variações</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setVariacaoEmEdicao(null)
              setDialogAberto(true)
            }}
          >
            <PlusIcon />
            Adicionar
          </Button>
        </div>
        <div className="space-y-2">
          {variacoesAtivas.map((v) => (
            <Card key={v.id} size="sm">
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{v.nome}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {formatarBRL(v.precoVenda)} · Estoque: {formatarQuantidade(v.estoqueAtual)}
                    {v.codigoBarras ? ` · ${v.codigoBarras}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {v.emRuptura && <Badge className="bg-warning/15 text-warning-foreground dark:text-warning">Ruptura</Badge>}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Editar variação"
                    onClick={() => {
                      setVariacaoEmEdicao(v)
                      setDialogAberto(true)
                    }}
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remover variação"
                    disabled={variacoesAtivas.length <= 1}
                    onClick={() => aoRemoverVariacao(v.id)}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="border-t pt-4">
        <Button variant="destructive" onClick={aoDesativarProduto} disabled={remover.isPending}>
          Desativar produto
        </Button>
        <p className="mt-1.5 text-xs text-muted-foreground">
          O produto some do catálogo ativo, mas o histórico de vendas é preservado.
        </p>
      </div>

      <VariacaoDialog
        aberto={dialogAberto}
        aoFechar={() => {
          setDialogAberto(false)
          setVariacaoEmEdicao(null)
        }}
        aoSalvar={aoSalvarVariacao}
        salvando={adicionarVariacao.isPending || atualizarVariacao.isPending}
        titulo={variacaoEmEdicao ? 'Editar variação' : 'Adicionar variação'}
        inicial={
          variacaoEmEdicao
            ? {
                nome: variacaoEmEdicao.nome,
                precoVenda: variacaoEmEdicao.precoVenda,
                precoCusto: variacaoEmEdicao.precoCusto ?? undefined,
                codigoBarras: variacaoEmEdicao.codigoBarras ?? undefined,
                sku: variacaoEmEdicao.sku ?? undefined,
                estoqueMinimo: variacaoEmEdicao.estoqueMinimo,
              }
            : undefined
        }
      />
    </div>
  )
}
