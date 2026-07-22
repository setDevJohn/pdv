import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Sem `test.globals: true` no vite.config.ts, o auto-cleanup do Testing
// Library não detecta o afterEach do Vitest sozinho — registra na mão para
// não vazar DOM de um teste para o outro.
afterEach(() => {
  cleanup()
})
