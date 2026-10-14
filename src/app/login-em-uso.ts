/** Há login de verdade: banco compartilhado (API) e o login não foi desativado no build. */
export const loginEmUso = (): boolean =>
  import.meta.env.VITE_REPOSITORIO === "api" &&
  import.meta.env.VITE_LOGIN !== "desativado"
