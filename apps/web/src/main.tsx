import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { router } from '@/routes/router'
import { SessionBootstrap } from '@/routes/session-bootstrap'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SessionBootstrap>
          <RouterProvider router={router} />
        </SessionBootstrap>
        <Toaster position="top-right" richColors />
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>,
)
