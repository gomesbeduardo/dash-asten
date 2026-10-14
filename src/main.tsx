import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { criarRepositorioIndexedDB } from "@/cargas"
import { registrarTiposDoApp } from "@/app/bootstrap"
import { RepositorioProvider } from "@/app/RepositorioContext"

registrarTiposDoApp()
const repositorio = criarRepositorioIndexedDB()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RepositorioProvider repositorio={repositorio}>
      <App />
    </RepositorioProvider>
  </StrictMode>
)
