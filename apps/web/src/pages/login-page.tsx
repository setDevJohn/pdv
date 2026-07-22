import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EstadoCarregando } from '@/components/estado'
import { useLogin } from '@/hooks/use-login'
import { resolverEmpresa } from '@/services/auth-service'
import { detectarSlugPorSubdominio } from '@/lib/subdominio'

interface EmpresaSelecionada {
  slug: string
  nome: string
}

// Fluxo em dois passos: 1) identificar a empresa (via subdomínio, com fallback
// manual de slug) 2) e-mail + senha. Ver checkpoint de segurança em
// docs/03-prompt-metodologia-agente.md para o porquê do slug existir.
export function LoginPage() {
  const navigate = useNavigate()
  const loginMutation = useLogin()

  const [prontoParaExibir, setProntoParaExibir] = useState(false)
  const [passo, setPasso] = useState<'empresa' | 'credenciais'>('empresa')
  const [empresa, setEmpresa] = useState<EmpresaSelecionada | null>(null)

  const [slugDigitado, setSlugDigitado] = useState('')
  const [verificandoEmpresa, setVerificandoEmpresa] = useState(false)
  const [erroEmpresa, setErroEmpresa] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  useEffect(() => {
    const candidato = detectarSlugPorSubdominio(window.location.hostname)
    if (!candidato) {
      setProntoParaExibir(true)
      return
    }
    resolverEmpresa(candidato)
      .then((resultado) => {
        if (resultado.existe && resultado.nome && resultado.slug) {
          setEmpresa({ slug: resultado.slug, nome: resultado.nome })
          setPasso('credenciais')
        }
      })
      .finally(() => setProntoParaExibir(true))
  }, [])

  async function aoConfirmarEmpresa(evento: FormEvent) {
    evento.preventDefault()
    setErroEmpresa(null)
    setVerificandoEmpresa(true)
    try {
      const resultado = await resolverEmpresa(slugDigitado.trim())
      if (resultado.existe && resultado.nome && resultado.slug) {
        setEmpresa({ slug: resultado.slug, nome: resultado.nome })
        setPasso('credenciais')
      } else {
        setErroEmpresa('Empresa não encontrada. Verifique o identificador.')
      }
    } catch {
      setErroEmpresa('Não foi possível verificar agora. Tente novamente.')
    } finally {
      setVerificandoEmpresa(false)
    }
  }

  function aoTrocarEmpresa() {
    setEmpresa(null)
    setPasso('empresa')
    setEmail('')
    setSenha('')
    loginMutation.reset()
  }

  function aoEntrar(evento: FormEvent) {
    evento.preventDefault()
    if (!empresa) return
    loginMutation.mutate(
      { slug: empresa.slug, email, senha },
      {
        onSuccess: (data) => {
          navigate(data.lojaAtivaId ? '/' : '/selecionar-loja', { replace: true })
        },
      },
    )
  }

  if (!prontoParaExibir) {
    return (
      <main className="flex min-h-svh items-center justify-center">
        <EstadoCarregando mensagem="Carregando..." />
      </main>
    )
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>
            {passo === 'empresa' ? 'Informe o identificador da sua empresa.' : `Entrando em ${empresa?.nome}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {passo === 'empresa' ? (
            <form className="space-y-4" onSubmit={aoConfirmarEmpresa}>
              <div className="space-y-1.5">
                <Label htmlFor="slug">Identificador da empresa</Label>
                <Input
                  id="slug"
                  placeholder="ex.: mercadinho-exemplo"
                  value={slugDigitado}
                  onChange={(e) => setSlugDigitado(e.target.value)}
                  autoFocus
                  required
                />
                {erroEmpresa && <p className="text-sm text-destructive">{erroEmpresa}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={verificandoEmpresa}>
                {verificandoEmpresa ? 'Verificando...' : 'Continuar'}
              </Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={aoEntrar}>
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                />
              </div>
              {loginMutation.isError && (
                <p className="text-sm text-destructive">
                  {isAxiosError(loginMutation.error) && loginMutation.error.response?.status === 401
                    ? 'Credenciais inválidas.'
                    : 'Não foi possível entrar agora. Tente novamente.'}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? 'Entrando...' : 'Entrar'}
              </Button>
              <Button type="button" variant="link" className="w-full" onClick={aoTrocarEmpresa}>
                Não é você? Trocar empresa
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
