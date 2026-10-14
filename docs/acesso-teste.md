# Acesso para teste

**App:** https://dash-asten.vercel.app
**Login:** desligado no MVP de validação (D52): o app abre direto. O código do login continua no projeto; para religar, remova `LOGIN_DESATIVADO` e `VITE_LOGIN` na Vercel e publique de novo. Aí vale usuário `asten` e a senha do time (`BASIC_AUTH_PASS`), com "Lembrar login" de 14 dias.

## Como testar

1. Abra o link num computador (de preferência ligado à TV). O app abre na tela de envio, com a lista do que já foi carregado.
2. Clique em "Nova carga" e escolha a planilha `.xlsx`. Confira o tipo (Chamados/OS) e a competência (mês de análise) e confirme.
3. A carga fica guardada no banco: abre em qualquer computador. Carregar de novo a mesma competência cria uma nova versão, sem apagar a anterior.
4. No painel de Chamados: **Leituras** traz os destaques do mês, **Comparar** põe duas competências lado a lado e **Evolução** mostra a série mês a mês.

Planilha fictícia para teste: `docs/exemplos/planilha-ficticia.xlsx` (fora do git; peça para quem tem o repo local).

## Trocar login ou senha (quando o login for religado)

Troque `BASIC_AUTH_USER`/`BASIC_AUTH_PASS` na Vercel (projeto `g0mes/dash-asten`) e publique de novo. Todas as sessões abertas caem e todo mundo volta para a tela de login.

## Ambientes

- **Produção** (`main`): https://dash-asten.vercel.app, dados no schema `public` do banco Neon.
- **Staging** (`staging`, previews e `vercel dev` local): schema `staging` do mesmo banco. O que se testa ali não aparece em produção.

## Publicação

- Projeto Vercel `g0mes/dash-asten`, publicado pela CLI depois do CI verde na `main` (`npx vercel deploy --prod --scope g0mes`).
- O deploy automático a cada push ainda não está ligado: a Vercel não tem acesso ao repositório privado no GitHub. Para ligar, instale o app da Vercel no GitHub com acesso a `gomesbeduardo/dash-asten` e rode `npx vercel git connect`.
