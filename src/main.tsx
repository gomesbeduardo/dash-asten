import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { criarRepositorioPadrao } from "@/cargas/escolherRepositorio"
import { registrarTiposDoApp } from "@/app/bootstrap"
import { RepositorioProvider } from "@/app/RepositorioContext"
import { SessaoGate } from "@/app/sessao/SessaoGate"

registrarTiposDoApp()
const repositorio = criarRepositorioPadrao()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SessaoGate>
      <RepositorioProvider repositorio={repositorio}>
        <App />
      </RepositorioProvider>
    </SessaoGate>
  </StrictMode>
)
