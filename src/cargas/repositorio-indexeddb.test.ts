import "fake-indexeddb/auto"
import { criarRepositorioIndexedDB } from "./repositorio-indexeddb"
import { suiteDeRepositorio } from "./repositorio.suite"

let n = 0
suiteDeRepositorio(() => criarRepositorioIndexedDB(`teste-${Date.now()}-${n++}`))
