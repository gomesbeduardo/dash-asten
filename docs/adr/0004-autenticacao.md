# 0004 — Autenticação

**Status:** aceita (login existe no código e está desligado no MVP)
**Data:** 14/10/2026 (D38, D52); registrada como ADR em 16/10/2026
**Decisões do PRD:** D38 (login próprio, usuário e senha únicos do time, token HMAC em cookie HttpOnly/Secure/SameSite=Lax, API protegida em duas camadas), D52 (login no código, mas desligado até a aprovação), D74 (login com Better Auth e contas individuais só com pedido explícito), D45 (o login é consequência do banco)

## Contexto

Com o histórico no banco (ADR 0002), os dados passaram a ficar acessíveis pela API, e a D45 registra que isso levou ao login. Em 14/10 o responsável pediu que o login ficasse **no código mas desligado** até a aprovação (D52). O risco foi aceito por ele: quem tiver o link vê e altera as cargas.

## Decisão

- **Login próprio**: tela com usuário e senha **únicos do time**, guardados como variáveis secretas na Vercel.
- O login gera um **token assinado (HMAC)** em cookie `HttpOnly`, `Secure`, `SameSite=Lax`. Com "lembrar", vale **14 dias**; sem, termina ao fechar o navegador.
- A chave de assinatura deriva do segredo, do usuário e da senha: **trocar o login ou a senha invalida todos os tokens**.
- A API é protegida em duas camadas: o roteador (`api/rota.ts`) confere a sessão antes de qualquer rota privada e cada handler confere de novo. A casca estática do app é pública (não contém dados).
- **No MVP o login está desligado**: no servidor, `LOGIN_DESATIVADO=1` faz toda requisição contar como sessão válida (`api/_lib/auth.ts`); no app, `VITE_LOGIN=desativado` esconde o botão "Sair". Religar é remover as duas variáveis na Vercel e publicar.
- **Contas individuais ficam fora do ciclo** (D74: "nada entra sem pedido explícito": login com Better Auth, "+ adicionar gráfico" e o próximo conjunto de dados). O plano registra que, se vierem, deve-se avaliar uma biblioteca pronta (Better Auth) e não autenticação própria.

## Consequências

Conferido no código:

- `api/_lib/auth.ts` implementa o token com `createHmac("sha256", ...)`, o cookie com `HttpOnly; Secure; SameSite=Lax` e a variável `LOGIN_DESATIVADO`. As variáveis de credencial lidas são `BASIC_AUTH_USER`, `BASIC_AUTH_PASS` e `AUTH_SECRET` (o prefixo `BASIC_AUTH` é herança do Basic Auth que o login próprio substituiu).
- `src/app/login-em-uso.ts` considera que há login quando `VITE_REPOSITORIO === "api"` e `VITE_LOGIN !== "desativado"`.
- **Não desmonte o código de login** enquanto estiver desligado: ele precisa continuar funcionando e testado para ser religado só por configuração.
- Rota privada nova na API passa pela lista `ROTAS` de `api/rota.ts` (privada é o padrão; só `login` e `logout` são marcadas como públicas) **e** o handler confere a sessão de novo.
- Não escrever autenticação nova própria (contas individuais) sem pedido explícito; se vier, avaliar biblioteca pronta.

## Alternativas

- Basic Auth era o mecanismo anterior; a D38 o substituiu pela tela de login própria. O motivo da troca não está registrado no PRD.
- Contas individuais: adiadas (D38, D74). Better Auth é a opção citada no plano para quando vierem.
