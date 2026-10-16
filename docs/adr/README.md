# Decisões de arquitetura (ADRs)

Um ADR (Architecture Decision Record, registro de decisão de arquitetura) é um arquivo curto que guarda **uma decisão de arquitetura ou de processo que muda como se desenvolve este app**: o que foi decidido, o que isso obriga ou proíbe no código e, quando está registrado, o que foi considerado e descartado.

Os ADRs não trazem decisão nova. Cada um reúne, por tema, decisões que já estão na tabela §0 do `PRD-dash-asten.md` (D1 a D77) e no `plan-dash-asten.md`. Onde o PRD não registra o motivo ou a alternativa, o ADR diz "não registrado".

## Quando criar um ADR novo

Crie quando a decisão for **difícil de desfazer** (banco, hospedagem, autenticação, fluxo de Git, modelo de dados) ou quando ela **direciona várias partes do código** (uma regra que toda tela ou todo painel precisa seguir). Decisão de uma tela só, ajuste visual ou regra de negócio isolada fica na spec (`docs/specs/`) e no PRD.

Passos:

1. Pegue o próximo número livre e crie `NNNN-titulo-curto.md` nesta pasta, com o modelo abaixo.
2. Registre a decisão do responsável no §0 do PRD (com o próximo Dxx) e cite o Dxx no ADR.
3. Acrescente o ADR ao índice abaixo.
4. ADR aceito não se reescreve: se a decisão mudar, crie um ADR novo, marque o antigo como "substituída por NNNN" e atualize o índice.

Antes de mudar algo que um ADR cobre, leia o ADR.

## Modelo

```markdown
# NNNN — Título

**Status:** aceita | substituída por NNNN | revista (data)
**Data:** dd/mm/aaaa
**Decisões do PRD:** Dxx (o que diz, numa cláusula), Dyy (...)

## Contexto
Por que a decisão apareceu, só com o que está no PRD, no plano ou no código.

## Decisão
O que ficou decidido.

## Consequências
O que isso obriga ou proíbe no código.

## Alternativas
Só as que estão registradas. Se não houver, omita a seção.
```

## Índice

| ADR | Tema | Status |
|---|---|---|
| [0001](0001-stack-do-front.md) | Stack do front | aceita |
| [0002](0002-banco-e-ambientes.md) | Banco e ambientes (Neon, Prisma, schemas) | aceita |
| [0003](0003-api-numa-funcao-so.md) | API numa função só e cache | aceita |
| [0004](0004-autenticacao.md) | Autenticação própria, desligada no MVP | aceita |
| [0005](0005-exclusao-de-cargas.md) | Exclusão: arquivar como padrão | aceita |
| [0006](0006-nenhum-chamado-excluido.md) | Nenhum chamado é excluído; dado derivado sinalizado; conferência independente | aceita |
| [0007](0007-modelo-de-posicao-do-mes.md) | Modelo de posição do mês | aceita |
| [0008](0008-registro-de-tipos-de-conjunto.md) | Registro de tipos de conjunto no código | aceita |
| [0009](0009-fluxo-de-git-e-entrega.md) | Fluxo de Git e entrega | aceita |
| [0010](0010-transicoes-de-valor.md) | Transições de valor sem remontar | aceita |
| [0011](0011-design-system-e-simplicidade.md) | Design system obrigatório e simplicidade primeiro | aceita |
| [0012](0012-spec-antes-do-codigo.md) | Spec antes do código (SDD + TDD) | aceita |
