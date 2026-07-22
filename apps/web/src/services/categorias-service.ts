import { apiClient } from '@/lib/api-client'
import type { Categoria } from './produtos-service'

export async function listarCategorias(): Promise<Categoria[]> {
  const { data } = await apiClient.get<Categoria[]>('/categorias')
  return data
}

export async function criarCategoria(nome: string): Promise<Categoria> {
  const { data } = await apiClient.post<Categoria>('/categorias', { nome })
  return data
}

export async function atualizarCategoria(id: string, nome: string): Promise<Categoria> {
  const { data } = await apiClient.patch<Categoria>(`/categorias/${id}`, { nome })
  return data
}

export async function removerCategoria(id: string): Promise<void> {
  await apiClient.delete(`/categorias/${id}`)
}
