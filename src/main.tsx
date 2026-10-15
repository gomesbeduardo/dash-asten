import { StrictMode } from "react"
import { MotionConfig } from "motion/react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { criarRepositorioPadrao } from "@/cargas/escolherRepositorio"
import { comCache } from "@/cargas/comCache"
import { registrarTiposDoApp } from "@/app/bootstrap"
import { RepositorioProvider } from "@/app/RepositorioContext"
import { duration, standard } from "@/components/app/motion/tokens"
import { SessaoGate } from "@/app/sessao/SessaoGate"

registrarTiposDoApp()
const repositorio = comCache(criarRepositorioPadrao())

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: duration.base, ease: standard }}
    >
      <SessaoGate repositorio={repositorio}>
        <RepositorioProvider repositorio={repositorio}>
          <App />
        </RepositorioProvider>
      </SessaoGate>
    </MotionConfig>
  </StrictMode>
)
