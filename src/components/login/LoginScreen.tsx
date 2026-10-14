import { useEffect, useRef, useState, type FormEvent } from "react"
import { Eye, EyeOff, Loader2 } from "lucide-react"

import { Switch } from "@/components/ui/switch"
import logo from "@/assets/asten-logo-fundo-claro.png"

export type ResultadoLogin = { ok: true } | { ok: false; erro: string }

interface Props {
  entrar: (usuario: string, senha: string, lembrar: boolean) => Promise<ResultadoLogin>
  /** Aviso informativo acima do formulário (ex.: sessão expirada). */
  aviso?: string
  /** Cobre o app que segue montado por baixo. */
  sobreposta?: boolean
}

const campo =
  "h-12 w-full rounded-lg border border-input bg-card px-3 text-lg text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"

export function LoginScreen({ entrar, aviso, sobreposta = false }: Props) {
  const [usuario, setUsuario] = useState("")
  const [senha, setSenha] = useState("")
  const [mostrar, setMostrar] = useState(false)
  const [lembrar, setLembrar] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const refUsuario = useRef<HTMLInputElement>(null)

  useEffect(() => {
    refUsuario.current?.focus()
  }, [])

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (enviando) return
    setEnviando(true)
    setErro(null)
    const r = await entrar(usuario.trim(), senha, lembrar)
    if (!r.ok) {
      setErro(r.erro)
      setEnviando(false)
    }
  }

  return (
    <main
      className={`grid min-h-svh place-items-center bg-background p-6 ${
        sobreposta ? "fixed inset-0 z-50 overflow-auto" : ""
      }`}
    >
      <style>{"@keyframes login-entrada{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}"}</style>
      <div className="w-full max-w-md">
        <img src={logo} alt="Asten" className="mx-auto mb-8 h-14 w-auto" />
        <form
          onSubmit={enviar}
          aria-labelledby="login-titulo"
          className="animate-[login-entrada_320ms_ease-out_both] rounded-xl border border-border border-t-4 border-t-brand bg-card p-8 motion-reduce:animate-none"
        >
          <h1 id="login-titulo" className="mb-6 text-2xl text-brand-ink">
            Entrar
          </h1>

          {aviso && (
            <p className="mb-5 rounded-md bg-muted px-3 py-2 text-base text-foreground">{aviso}</p>
          )}

          <label htmlFor="login-usuario" className="mb-1.5 block text-base font-medium">
            Usuário
          </label>
          <input
            id="login-usuario"
            ref={refUsuario}
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            className={campo}
          />

          <label htmlFor="login-senha" className="mb-1.5 mt-5 block text-base font-medium">
            Senha
          </label>
          <div className="relative">
            <input
              id="login-senha"
              type={mostrar ? "text" : "password"}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="current-password"
              required
              className={`${campo} pr-12`}
            />
            <button
              type="button"
              onClick={() => setMostrar((v) => !v)}
              aria-label={mostrar ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={mostrar}
              className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              {mostrar ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
            </button>
          </div>

          <div className="mt-5 flex min-h-11 items-center justify-between gap-3">
            <label htmlFor="lembrar-login" className="cursor-pointer text-base">
              Lembrar login
            </label>
            <Switch
              id="lembrar-login"
              checked={lembrar}
              onCheckedChange={setLembrar}
            />
          </div>

          {erro && (
            <p role="alert" className="mt-5 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-base text-destructive">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            aria-busy={enviando}
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary text-lg font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-70"
          >
            {enviando && <Loader2 aria-hidden className="size-5 animate-spin motion-reduce:animate-none" />}
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  )
}
