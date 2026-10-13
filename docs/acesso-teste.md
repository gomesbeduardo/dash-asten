# Acesso para teste

**App:** https://dash-asten.vercel.app
**Login:** não tem. O acesso é aberto: o app não guarda dado nenhum e a planilha é lida só no navegador de quem abre.

## Como testar

1. Abra o link num computador (de preferência ligado à TV).
2. Arraste uma planilha `.xlsx` para a tela ou clique em "Escolher arquivo".
3. Atalhos: **← →** trocam de aba · **1–9** vão direto à aba · **F** abre os filtros · **H** mostra/esconde a barra. Mexer o mouse também mostra a barra.

Planilha fictícia para teste: `docs/exemplos/planilha-ficticia.xlsx` (fora do git; peça para quem tem o repo local).

## Publicação

- Projeto Vercel `g0mes/dash-asten`, publicado pela CLI (`npx vercel deploy --prod --scope g0mes`).
- O deploy automático a cada push ainda não está ligado: a Vercel não tem acesso ao repositório privado no GitHub. Para ligar, instale o app da Vercel no GitHub com acesso a `gomesbeduardo/dash-asten` e rode `npx vercel git connect`.
