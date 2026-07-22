import { useEffect, useState } from 'react'

// Atrasa a propagação de um valor que muda rápido (ex.: texto de busca) para
// não disparar uma requisição a cada tecla.
export function useDebounce<T>(valor: T, atrasoMs = 350): T {
  const [debounced, setDebounced] = useState(valor)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(valor), atrasoMs)
    return () => clearTimeout(id)
  }, [valor, atrasoMs])

  return debounced
}
