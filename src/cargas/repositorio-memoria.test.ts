import { criarRepositorioMemoria } from "./repositorio-memoria"
import { suiteDeRepositorio } from "./repositorio.suite"

suiteDeRepositorio(() => criarRepositorioMemoria())
