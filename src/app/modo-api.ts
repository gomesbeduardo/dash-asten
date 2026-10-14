/** Produção: as cargas vão para o banco do app (e não só para este navegador). */
export const modoApi = (): boolean => import.meta.env.VITE_REPOSITORIO === "api"
