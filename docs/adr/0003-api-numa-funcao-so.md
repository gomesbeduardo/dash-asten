# 0003 — API numa função só e cache

**Status:** aceita
**Data:** 14/10/2026 (D46, Fase 2E); registrada como ADR em 16/10/2026
**Decisões do PRD:** D46 (API numa função só, carga com cache imutável, abertura sem chamada separada de sessão, pré-carga), D53 (o app abre na tela de envio e não baixa nenhuma carga até a pessoa escolher), D37 (API em Vercel Functions)

## Contexto

Abrir o app com cargas salvas levava cerca de 8 s na Vercel. A medição de 14/10 (D46) mostrou que os índices do banco não eram o gargalo (leitura por chave primária, tabela pequena). O que pesava era a rede em série (sessão, lista, carga): 2 a 3 s com a função quente e **6,1 s a frio**, sendo 2,3 s só na verificação de sessão, sem tocar o banco, porque cada função e o Routing Middleware acordavam separados. A meta era abrir a frio em cerca de 3 s. O plano registra o resultado: de 6,1 s para cerca de 2,5 s de rede.

## Decisão

- **Toda a API é uma função só**, `api/rota.ts`. O `vercel.json` reescreve `/api/:caminho*` para `/api/rota?r=:caminho*`. A checagem de login fica dentro dessa função e **substitui o Routing Middleware** que a D38 usava, que era mais uma partida a frio por chamada.
- A carga (`GET /api/cargas/:id`) tem **cache permanente** no navegador, porque a versão de uma carga nunca muda.
- A abertura não faz a chamada separada de sessão.
- Cargas já baixadas são reaproveitadas entre as visões, com pré-carga e estado de carregamento.
- O app abre na tela de envio e não baixa carga nenhuma até a pessoa escolher (D53).

## Consequências

Conferido no código:

- Rota nova da API entra na lista `ROTAS` de `api/rota.ts`, com o handler em `api/_rotas/` (hoje `login`, `logout`, `sessao`, `cargas`, `carga`). Não se cria arquivo de função novo em `api/` para cada endpoint: isso traria de volta uma partida a frio por rota.
- Método sem handler responde 405 ("Método não permitido"); é assim que não existe "apagar tudo" em `/api/cargas` (plano, Fase 2D).
- `api/_rotas/carga.ts` responde a carga com `Cache-Control: private, max-age=31536000, immutable`. Como a resposta é cacheada para sempre, **uma carga não pode mudar de conteúdo sob o mesmo id**; correção de dados vira nova versão. O `PATCH` da D58 muda só metadados (nome, tipo, competência e arquivamento), e o app lê esses campos da listagem, não do corpo da carga (comentário em `api/_rotas/carga.ts`).
- As respostas JSON comuns da API (listagem, erros) saem com `Cache-Control: no-store` (`api/_lib/http.ts`).
- No cliente, o repositório é embrulhado por `comCache` (`src/main.tsx`) e o estado de carregamento aparece nas visões.
- O desempenho da abertura é requisito (PRD §11 e §15): abrir o Painel e trocar o "Comparar com" com 12 posições leva menos de 1 s (D74).

## Alternativas

- Uma função por endpoint com Routing Middleware para a sessão (a arquitetura anterior, D38): descartada pela medição acima, por somar partidas a frio.
- Outras opções de otimização (por exemplo, mudar de hospedagem ou de banco): não registrado.
