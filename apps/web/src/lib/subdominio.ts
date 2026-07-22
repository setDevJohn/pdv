// Detecta um possível slug de empresa a partir do subdomínio (ex.:
// "mercadinho-exemplo.pdv.com.br" -> "mercadinho-exemplo").
//
// Compara contra um domínio-base configurado (VITE_BASE_DOMAIN) em vez de
// tentar adivinhar a estrutura de qualquer TLD — TLDs compostos como
// ".com.br" quebram heurísticas baseadas só em contar labels. Sem
// VITE_BASE_DOMAIN configurado (ainda não há DNS curinga — ver checkpoint de
// segurança em docs/03-prompt-metodologia-agente.md), a função sempre
// retorna null e a tela de login cai no campo manual de slug, por design.
const HOSTS_RESERVADOS = new Set(['www', 'app', 'api'])

export function detectarSlugPorSubdominio(
  hostname: string,
  baseDomain: string | undefined = import.meta.env.VITE_BASE_DOMAIN,
): string | null {
  if (!baseDomain || hostname === baseDomain) {
    return null
  }
  if (!hostname.endsWith(`.${baseDomain}`)) {
    return null
  }

  const candidato = hostname.slice(0, hostname.length - baseDomain.length - 1)
  if (!candidato || candidato.includes('.') || HOSTS_RESERVADOS.has(candidato)) {
    return null
  }

  return candidato
}
