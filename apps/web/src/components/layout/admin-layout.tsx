import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboardIcon, PackageIcon, TagsIcon, LogOutIcon } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'
import { usePerfilAtivo } from '@/hooks/use-perfil-ativo'
import { useLogout } from '@/hooks/use-logout'
import type { PerfilAcesso } from '@pdv/shared-types'

interface ItemNav {
  titulo: string
  para: string
  icone: typeof PackageIcon
  perfis?: PerfilAcesso[]
}

const ITENS: ItemNav[] = [
  { titulo: 'Início', para: '/', icone: LayoutDashboardIcon },
  { titulo: 'Produtos', para: '/produtos', icone: PackageIcon },
  { titulo: 'Categorias', para: '/categorias', icone: TagsIcon, perfis: ['ADMIN'] },
]

export function AdminLayout() {
  const navigate = useNavigate()
  const usuario = useAuthStore((s) => s.usuario)
  const lojas = useAuthStore((s) => s.lojas)
  const lojaAtivaId = useAuthStore((s) => s.lojaAtivaId)
  const perfil = usePerfilAtivo()
  const logoutMutation = useLogout()

  const lojaAtiva = lojas.find((loja) => loja.lojaId === lojaAtivaId)
  const itensVisiveis = ITENS.filter((item) => !item.perfis || (perfil && item.perfis.includes(perfil)))

  function aoSair() {
    logoutMutation.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) })
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="px-2 py-1.5">
            <p className="font-heading text-sm font-semibold">PDV</p>
            <p className="truncate text-xs text-muted-foreground">{lojaAtiva?.nome}</p>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {itensVisiveis.map((item) => (
                  <SidebarMenuItem key={item.para}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.para} end={item.para === '/'}>
                        <item.icone />
                        <span>{item.titulo}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center justify-between gap-2 px-2 py-1">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{usuario?.nome}</p>
              <p className="text-xs text-muted-foreground">{perfil}</p>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={aoSair} aria-label="Sair" disabled={logoutMutation.isPending}>
              <LogOutIcon />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b px-4">
          <SidebarTrigger />
        </header>
        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
