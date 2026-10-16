# Pesquisa: boas práticas de dashboards e gráficos (base para o redesenho do dash-asten)

Data: 2026-10-15. Contexto: painel de chamados em TV (inclusive 4K ultrawide), reunião semanal, leitura a 2-4 m.

## Nota de método e confiabilidade
- **[V]** = página aberta nesta pesquisa e conteúdo conferido: Datawrapper (eixo duplo, texto em gráficos, cores), W3C WCAG 2.1 SC 1.4.11, IBM Carbon (dashboards), NN/g (dashboards e atributos pré-atentivos). Os PDFs do Perceptual Edge foram baixados e lidos como texto na segunda passada de verificação.
- **[V-corrigido]** = a fonte aberta contradiz ou refina a frase original; o texto foi ajustado e a correção está dita na linha.
- **[M]** = conhecimento das obras citadas (Few, Tufte, Knaflic, IBCS, Cleveland & McGill, FT) que **continua sem fonte aberta** depois da segunda passada; o motivo de cada um está no "Registro de verificação" no fim. Números de página/citação literal não são dados aqui de propósito.
- Verificação feita em 2026-10-15: livros (Few 2013, Tufte, Knaflic 2015, Cairo 2019) não foram abertos; onde só o livro sustenta a frase, ficou [M]. Resumos de página feitos por ferramenta de leitura; conferi o texto bruto dos PDFs do Perceptual Edge, do Heer & Robertson e do IBCS.
- Onde uma frase é inferência minha para o dash-asten, está marcada **(inferência)**.
- Não achei: norma publicada de "tamanho mínimo em pt para TV a 3 m" em fonte primária de dataviz. O que vai abaixo sobre isso é regra de ótica (inferência), não citação.

---

## 1. Princípios de layout de dashboard
1. **Dashboard = informação mais importante, num só olhar, numa tela.** Few define dashboard como exibição visual das informações mais importantes, consolidadas numa única tela para serem monitoradas de relance. Evite rolagem e fragmentação em várias telas. [V] https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf (texto literal: "a visual display of the most important information needed to achieve one or more objectives, consolidated and arranged on a single screen so the information can be monitored at a glance"; Pitfall #1 = "Exceeding the boundaries of a single screen"). O link anterior (rules_for_using_color.pdf) era de outro assunto (cor); livro *Information Dashboard Design* (Few, 2013) [M].
2. **Hierarquia: o mais importante ganha maior área e maior contraste, no alto à esquerda.** Carbon: "most important data should have the highest contrast and occupy the largest area"; padrão em F para posicionar. [V] https://carbondesignsystem.com/data-visualization/dashboards/
3. **Dois tipos de dashboard, dois desenhos.** Carbon separa "presentation" (poucos KPIs, status) de "exploration" (filtros, drill). TV de reunião é presentation: menos controles, tudo já filtrado. [V] mesma página.
4. **Preferir atributos pré-atentivos: comprimento e posição 2D.** NN/g recomenda barras, linhas, dispersão, bullet; desaconselha pizza/rosca, treemap, medidores (gauge) e 3D em dashboards de decisão rápida. [V] https://www.nngroup.com/articles/dashboards-preattentive/
5. **Espaço em branco é função, não desperdício.** Carbon cita ganho de compreensão com respiro. Few também manda eliminar bordas/caixas e usar espaço para agrupar (Gestalt: proximidade). [V] Carbon; Few contra decoração inútil [V] Pitfall #11 em https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf; a parte "bordas/Gestalt" fica [M] (só no livro).
6. **Agrupar por pergunta de negócio**, não por tipo de gráfico. Cada bloco com um título que diga a pergunta ("Quem está atrasado?", "Estamos melhorando?"). Knaflic: cada elemento deve ter um propósito; remova o que não ajuda a pergunta. [M] https://www.storytellingwithdata.com/ ; livro *Storytelling with Data* (2015).
7. **Quantidade: poucos blocos.** Few defende que o essencial caiba numa tela, com resumo e depois detalhe; não há número mágico em fonte primária, mas a prática de TV é ~5-9 itens de primeiro nível. **(inferência)**
8. **Teste dos 5 segundos**: alguém que nunca viu a tela deve dizer, em 5 s, "como estamos e onde está o problema". Prática de UX; a base é o conceito de "at-a-glance" de Few e NN/g. [V NN/g definição "at-a-glance"; M para o nome "5-second test"]
9. **Mesma grade para tudo**: Carbon (exploration) pede layouts, espaçamentos e posições de legenda uniformes entre gráficos. [V]
10. **Cartões**: usar para separar *grupos*, não para cada gráfico; borda/sombra em todo gráfico é excesso de moldura (Tufte: razão dado-tinta; Few: não encaixotar sem necessidade). [V-corrigido] Tufte: a razão dado-tinta e o "chartjunk" estão confirmados (https://spectrum.ieee.org/tufteisms ; página do livro https://www.edwardtufte.com/book/the-visual-display-of-quantitative-information/ lista "The data-ink ratio"); a página do livro **não** define os termos, e "Few: não encaixotar" não achei em fonte aberta, ficou [M].

## 2. KPIs e variação
1. **Valor grande, rótulo pequeno e claro, variação ao lado.** O número é o herói; a variação vem em tamanho menor, com o período de comparação escrito ("vs. mar/26"). [M] Few, cap. sobre KPIs; Knaflic cap. "focus attention".
2. **Mostre sempre contra o quê** (mês anterior, meta). Variação sem referência explícita confunde. [V] IBCS: a notação de cenários distingue real, anterior e plano (ver §4.2) https://www.ibcs.com/wp-content/uploads/2018/01/UN-3.2_More-scenarios_2018-01-23_rh.pdf (proposta Hichert & Faisst de 2018 para o capítulo UN 3.2; o texto oficial da v2.0 não está aberto no site). A frase "mostre sempre contra o quê" é inferência mínima.
3. **Cor semântica só quando há sentido bom/ruim definido.** "Aumento de chamados" é ruim, "aumento de finalizados" é bom: a seta indica direção, a cor indica julgamento, e o sentido é por métrica, não por sinal. [M] IBCS (cor verde/vermelho de variação: só vi em resumo de fornecedor, não na norma); Few [V] Pitfall #12 e Regra #3/#5 (cor só quando serve a um objetivo; tons suaves para o geral, forte para o que exige atenção) https://www.perceptualedge.com/articles/visual_business_intelligence/rules_for_using_color.pdf
4. **Não depender só da cor**: acompanhe com seta/sinal (+/−) e texto. Cor sozinha falha para ~8-10% dos homens (Few cita 10% dos homens e 1% das mulheres). [V] NN/g e Datawrapper (testar daltonismo) acima; Few [V] Pitfall #12 https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf
5. **Sparkline junto do número** para dar tendência sem novo gráfico (Tufte "sparklines: intense, simple, word-sized graphics"). Com marcador no último ponto. [V] https://www.edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/ ("a small intense, simple, word-sized graphic with typographic resolution"; a página marca pontos mais velho/mais novo e mínimo/máximo com cor).
6. **Menos KPIs.** Fonte primária não fixa número; a lógica de Carbon/Few é um bloco principal pequeno e o resto subordinado. **(inferência)**: 12 KPIs iguais competem entre si; escolher 4-6 principais grandes e jogar o restante para uma faixa secundária menor.
7. **Quando não usar cor**: quando a métrica não tem lado bom/ruim (volume total), ou quando tudo estaria vermelho. Use cinza/neutro e deixe a cor para a exceção. [V] Few, Regras #3 e #5 ("use color only when needed to serve a particular communication goal"; "soft, natural colors" para a maior parte e cores vivas/escuras para o que exige atenção) https://www.perceptualedge.com/articles/visual_business_intelligence/rules_for_using_color.pdf ; Knaflic [V] https://www.storytellingwithdata.com/blog/2015/03/the-biggest-bang-for-your-buck
8. **Bullet chart no lugar de gauge** quando houver meta: Few inventou o bullet para substituir medidores; NN/g também aponta gauge como desperdício de espaço. [V NN/g] [V Few] "developed to replace the meters and gauges that are often used on dashboards"; compara a medida a uma meta ou à mesma medida num ponto do passado (ex.: um ano atrás) https://www.perceptualedge.com/articles/misc/Bullet_Graph_Design_Spec.pdf ; crítica ao gauge também em https://www.perceptualedge.com/articles/dmreview/dashboard_design.pdf

## 3. Duas medidas de unidades diferentes por categoria (caso Área × SLA)
Problema: % no SLA (0-100%, dos finalizados) ao lado de contagem de vencidos (dos não finalizados). São populações diferentes, escalas diferentes. As fontes convergem: **não colocar no mesmo eixo, não usar eixo duplo**.

| Opção | Prós | Contras | Veredito |
|---|---|---|---|
| Eixo duplo | Uma só caixa | Escalas arbitrárias, comparações visuais falsas, estudo citado pelo Datawrapper: pior em precisão e tempo [V] | **Evitar** |
| Duas barras de unidades diferentes lado a lado no mesmo eixo (hoje) | Compacto | Mesma barra, dois significados; leitor compara comprimentos que não são comparáveis | **Evitar** |
| **Small multiples / painéis lado a lado alinhados por categoria** | Cada medida com seu próprio eixo e título; mesma ordem de linhas; leitura direta | Ocupa 2 colunas | **Recomendado** (Datawrapper: "side-by-side charts" é a 1ª das 4 alternativas; estudo de Isenberg et al. 2011: o gráfico sobreposto foi pior em precisão e tempo) [V] https://www.datawrapper.de/blog/dualaxis ; Knaflic também manda separar os gráficos na vertical ou rotular direto [V] https://www.storytellingwithdata.com/blog/2016/2/1/be-gone-dual-y-axis |
| Tabela com barras embutidas (in-cell bars) | Mostra rótulo numérico exato + comprimento; colunas com unidade própria no cabeçalho | Menos "gráfico" | **Muito bom para TV** (Few: tabela quando se precisa de valores exatos; "Show Me the Numbers", Tufte: tabelas para comparar poucos números) [M] |
| Dot plot de Cleveland (uma medida) + coluna de número | Ótimo para % em faixa 0-100; sem exigir zero | Só uma medida por painel | Bom como um dos dois painéis (Cleveland & McGill: posição ao longo de escala comum é a tarefa perceptual mais precisa; dot plot não exige zero [V] https://www.datawrapper.de/academy/category/dot-charts) [V] ranking confirmado em slides de curso, não no artigo original (DOI não aberto): https://info3312.infosci.cornell.edu/slides/04-graphical-perception.html |
| Bullet chart | Valor + meta (ex.: % SLA vs. meta 95%) + faixas | Só serve se houver meta | Bom se existir meta de SLA |
| Quadrante / scatter (x = % no SLA, y = nº vencidos, um ponto por área) | Mostra relação entre as duas medidas e destaca áreas críticas (baixo SLA e muitos vencidos) | Exige leitura de dois eixos; rótulos de ponto; menos óbvio a 3 m | Útil como *segunda* visão, não como substituto |
| Anotar a medida secundária em texto | Simples (Datawrapper: "prioritizing with labels") [V] | Perde comparação visual | Aceitável para a medida menos importante |

**Recomendação para Área × SLA (fundamentada):** transformar em **duas colunas alinhadas, uma linha por área, mesma ordem**: (1) esquerda "Finalizados dentro do SLA (%)" como barra/ponto numa escala fixa 0-100% com marcador de meta, valor escrito; (2) direita "Não finalizados com SLA vencido (chamados)" como barra de contagem, valor escrito. Título de cada coluna diz a unidade e a população. Ordenar pela coluna que importa para a ação (vencidos desc.) e manter a mesma ordem nas duas. Realçar em cor só as áreas fora da meta; resto em cinza/azul neutro. Se o espaço for curto, usar a versão tabela com barras embutidas. Um só gráfico com duas unidades deve sumir. Fontes: Datawrapper (acima) [V], Cleveland & McGill [V] (slides de curso acima), Few bullet [V] / tabelas [M], Tufte small multiples [V] (a página do livro lista o tema: https://www.edwardtufte.com/book/envisioning-information/ ; ver também a ressalva de escala no §6.2).

## 4. Barras agrupadas e comparação entre dois períodos
1. **Comparar dois períodos: dot plot / haltere (dumbbell) ou barra com marcador do período anterior**, em vez de barras agrupadas duplas. A posição de um marcador contra a barra é lida mais precisamente que dois comprimentos adjacentes. [V] Cleveland & McGill (posição em escala comum > comprimento; os slides sugerem trocar barra empilhada por dot plot agrupado) https://info3312.infosci.cornell.edu/slides/04-graphical-perception.html ; dumbbell/dot plot conectado para comparar dois períodos: https://www.storytellingwithdata.com/blog/2020/12/9/what-is-a-dot-plot (alerta: é menos familiar, rotule e explique); Datawrapper: range plot = "alternativa a barras agrupadas", arrow plot = mudança entre dois anos https://www.datawrapper.de/academy/category/dot-charts ; Few: bullet com a medida de um ano atrás como marcador comparativo https://www.perceptualedge.com/articles/misc/Bullet_Graph_Design_Spec.pdf . [V-corrigido] A categoria "Deviation/Change" do FT **não existe**: o Visual Vocabulary tem 9 categorias (Deviation, Correlation, Ranking, Distribution, Change over Time, Part-to-whole, Magnitude, Spatial, Flow); "dumbbell" não está listado; "Dot plot" está em Distribution e "Slope" em Ranking e em Change over Time ("bom com 2 ou 3 pontos") https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary
2. **O contorno tracejado atual do mês comparado** já é a ideia certa (marcador de referência). Troque por um **traço/tick vertical sólido fino** na posição do valor anterior: tracejado de contorno é visualmente ruidoso a distância. **(inferência)**; IBCS manda tratar "anterior" como cor/forma consistente e mais discreta que o "real" [V] na notação de cenários, real = sólido escuro, plano = só contorno, previsão = hachurado com contorno, período anterior em cinza mais claro ("the later the darker") https://www.ibcs.com/wp-content/uploads/2018/01/UN-3.2_More-scenarios_2018-01-23_rh.pdf (proposta de 2018 para a próxima versão; não é o texto final da v2.0)
3. **Séries por grupo: máximo ~2 numa barra agrupada**; acima disso, small multiples. Few/Knaflic: agrupar muitas séries cria "cerca" de barras. [M] (não achei fonte aberta com o número "2"; Datawrapper recomenda no máximo 3 pontos por linha num dot plot, exceção 5 [V] https://www.datawrapper.de/academy/how-to-create-a-dot-plot)
4. **Ordenar por valor** (não por ordem alfabética) em categorias nominais; ordem natural só para tempo/faixas ordinais. Knaflic e Datawrapper convergem. [M] (Datawrapper só diz, para small multiples, que painéis devem ser ordenados por critério explícito [V] https://www.datawrapper.de/blog/what-to-consider-when-creating-small-multiple-line-charts ; a regra para barras nominais ficou sem fonte aberta)
5. **Rótulos diretos** no fim da barra, sem legenda separada; se precisar de legenda, uma só, perto dos dados (Datawrapper: remover chaves de cor e rotular no próprio gráfico). [V] https://www.datawrapper.de/blog/text-in-data-visualizations
6. **Barras começam em zero**. Eixo truncado em barra distorce a proporção; se o foco é a diferença, use dot plot/haltere (que não exige zero). [V] Datawrapper: barras começam em zero porque eixo truncado faz o leitor superestimar a diferença (Pandey et al. 2015); alternativas: dot plot, linha, ou plotar a diferença https://www.datawrapper.de/academy/why-our-column-and-bar-charts-start-at-zero ; Few: o bullet começa em zero e, se a escala não começa em zero, a medida vira símbolo (X/ponto), não barra https://www.perceptualedge.com/articles/misc/Bullet_Graph_Design_Spec.pdf . Cairo, *How Charts Lie* (2019) [M] (livro).
7. **Top N + "Outros"** para cliente/operador com cauda longa. **Cuidado com a regra do projeto D34 (nenhum dado descartado)**: "Outros" agrega mas não esconde; mantenha acesso ao detalhe. **(inferência)**

## 5. Barras empilhadas (composição)
1. Funcionam quando o **segmento da base** é o que se compara bem (todos partem do mesmo zero); os demais segmentos têm base flutuante e são difíceis de comparar entre barras. [V] Knaflic: "the bottom subcategory ... will always be the easiest to compare" https://www.storytellingwithdata.com/blog/stacked-bars ; Cleveland & McGill: posição em escala comum é a tarefa mais precisa, comprimento sem base comum é pior https://info3312.infosci.cornell.edu/slides/04-graphical-perception.html
2. **Limite**: ~3-5 segmentos (Datawrapper sugere 5-6 colunas de dados num stacked bar, por legibilidade [V] https://www.datawrapper.de/academy/how-to-create-a-stacked-bar-chart; o número 3-5 é inferência). Com 7+ situações (Finalizado, Aguardando cliente, Em Análise...), agrupe em poucas famílias (Concluído / Esperando terceiros / Em tratamento / Atrasado) **sem perder o detalhe** (D34), ou use small multiples/barras por situação. **(inferência)**
3. **Absoluto vs. 100%**: absoluto quando o tamanho total importa (carga por cliente); 100% quando a pergunta é proporção (quanto % está atrasado). Não misturar na mesma tela sem rotular. [V] Knaflic: empilhada vale quando o foco é o total da barra; a versão 100% dá duas bases (0% e 100%) e permite comparar dois segmentos https://www.storytellingwithdata.com/blog/stacked-bars
4. **Ordem de segmentos fixa e semântica** (bom → ruim) com a cor do segmento crítico em destaque e o resto em tons neutros. [V-acréscimo] Knaflic: ponha a categoria mais importante **junto da base**, que é a única comparável entre barras https://www.storytellingwithdata.com/blog/stacked-bars . Para o dash-asten: se o que importa é "atrasado", ele deve ficar na base da barra, não no meio.
5. **Alternativas**: barras separadas (small multiples), tabela com barras embutidas, ou dot plot por situação. A barra única de topo (situação do total) é aceitável por ser uma só composição de um todo. [V] FT Visual Vocabulary "Part-to-whole" (lista Stacked Column, Proportional Stacked Bar, Pie, Donut, Treemap, Waterfall...). https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary
6. **Operador × Atraso por faixa (1, 2-3, 4-6, 7+)**: faixas são ordinais, então use **escala sequencial de uma só cor** (claro → escuro) em vez de cores categóricas diferentes. [V] ColorBrewer oferece esquemas sequencial, divergente e qualitativo https://colorbrewer2.org ; Few usa o mesmo raciocínio nas faixas do bullet: intensidades de um só matiz, escuro = pior (por causa do daltonismo), máximo 5 faixas e idealmente 3 https://www.perceptualedge.com/articles/misc/Bullet_Graph_Design_Spec.pdf ; ver §7.

## 6. Séries temporais pequenas (sparklines, small multiples)
1. **Small multiples**: mesmo formato, mesma escala, uma figura por métrica, para comparar rapidamente. Tufte. [V] a página de *Envisioning Information* lista "small multiples" como tema https://www.edwardtufte.com/book/envisioning-information/ ; definição e "mesma escala/mesmo desenho" em Knaflic: "The axes and scale should generally be [the same] across the repeated charts" https://www.storytellingwithdata.com/blog/2020/1/6/swdchallenge-small-multiples
2. **Escala comum vs. independente**: comum quando as séries têm a mesma unidade e se quer comparar magnitude; **independente (por painel) quando as unidades diferem**, como acontece entre as 7 métricas. Nesse caso, rotule o último valor e os extremos, porque a escala não é comparável entre painéis. [V-corrigido] Datawrapper e Knaflic recomendam **evitar** escalas independentes quando possível, porque o leitor presume eixo comum; se forem inevitáveis (unidades diferentes), sinalize de forma explícita (valor atual e extremos escritos, eixo/grade visível) https://www.datawrapper.de/blog/what-to-consider-when-creating-small-multiple-line-charts ; Tufte/Few sobre escala independente [M] (sem fonte aberta).
3. **Destaque o último ponto** (marcador + valor) e, opcional, mín/máx; é o que o diretor quer ler. [V] a página de teoria de sparklines (trecho de *Beautiful Evidence*) usa cor para o valor mais velho/mais novo e para mínimo/máximo https://www.edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/ ; a mesma página cita proporção que dê inclinações médias de ~45 graus (Cleveland) para a tendência ficar legível.
4. **Linha em vez de área** para tendência; área preenchida só quando o volume acumulado é a ideia. Para contagens por mês, **barras finas** são mais honestas que área suavizada. **(inferência)** a partir de Few e Cleveland.
5. **Dados faltantes**: não interpolar em silêncio; quebrar a linha ou marcar o mês incompleto (ex.: mês corrente parcial) com estilo diferente e legenda. [V-corrigido] IBCS distingue real, previsão (hachurado + contorno) e plano (contorno) https://www.ibcs.com/wp-content/uploads/2018/01/UN-3.2_More-scenarios_2018-01-23_rh.pdf ; **mês parcial** não aparece nesse documento: aplicar o estilo "previsão" a mês incompleto é extensão minha **(inferência)**.
6. **Sem eixos pesados, sem grade** nos minigráficos; mantenha só linha de base opcional. [V] Tufte: sparkline sem molduras nem caixas, integrada ao texto/tabela https://www.edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/

## 7. Cor
1. **Três usos, três paletas**: categórica (identidade), sequencial (ordem/magnitude, um matiz), divergente/semântica (bom-ruim). Não usar arco-íris. [V] Datawrapper cores https://www.datawrapper.de/blog/colors-for-data-vis-style-guides ; [V] ColorBrewer (sequential / diverging / qualitative) https://colorbrewer2.org
2. **Quantidade**: categórica funciona até ~5-7 cores, o ideal bem menos. Datawrapper trata 3-10 como pequena paleta, e a prática de chart-doctor/FT é usar poucas. [V parcial]
3. **Cor de destaque + cinza para contexto.** Datawrapper: ao menos um cinza para dados e vários cinzas para eixos/rótulos; acento definido para gráficos de uma só cor. Knaflic: "use color strategically". [V] Datawrapper; [V] Knaflic: "When used sparingly, color is your single biggest tool for drawing your audience's attention"; começa pondo tudo em cinza claro https://www.storytellingwithdata.com/blog/2015/03/the-biggest-bang-for-your-buck
4. **Consistência por significado**: a mesma cor = a mesma coisa em toda a página (ex.: vencido = sempre a mesma cor; "mês atual" vs. "mês comparado" sempre iguais). Carbon: "maintain uniform color assignments". [V] Carbon.
5. **Não use a cor de alerta (vermelho/laranja) como cor categórica.** Reserve para o desvio. [V] Few, Regra #4 ("use different colors only when they correspond to differences of meaning") e Pitfall #12 (cor diferente por barra "means nothing"; manter cores sutis e neutras, exceto para destacar) https://www.perceptualedge.com/articles/visual_business_intelligence/rules_for_using_color.pdf ; a frase específica sobre vermelho/laranja é minha extensão.
6. **Acessibilidade**: elementos gráficos exigem contraste ≥ 3:1 contra o fundo/adjacentes (WCAG 2.1 SC 1.4.11), sem exceção por "escolha estética". [V] https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html ; texto normal 4.5:1 e texto grande (>=18 pt, ou >=14 pt em negrito) 3:1 (SC 1.4.3, [V] https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html). Teste com simulador de daltonismo e **varie luminosidade, não só matiz** (Datawrapper). [V]
7. **Verde/vermelho sozinhos falham em daltonismo**: acrescente seta, ícone ou posição; ou use azul/laranja. [V] Few, Pitfall #12: vermelho/amarelo/verde excluem os ~10% de homens e 1% de mulheres daltônicos https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf ; NN/g e Datawrapper conforme acima.
8. **TV**: fundo escuro ou claro é escolha; em TV curva ultrawide numa sala, fundo escuro suave cansa menos e faz a cor de alerta saltar, mas confira o contraste em ambos. **(inferência)**

## 8. Tipografia e rótulos
1. **Título que diz a conclusão ("action title")** em gráficos de reunião: "Operações concentra 60% do atraso" em vez de "Operador × Atraso". Knaflic e Datawrapper (títulos em linguagem simples, detalhe técnico em nota). [V Datawrapper] https://www.datawrapper.de/blog/text-in-data-visualizations ; [V Knaflic] título descreve o ponto, não só o tema ("Customer Service Sentiment Lowest" em vez de "Customer Sentiment") https://www.storytellingwithdata.com/blog/2020/3/5/transforming-slide-titles
   - **Cuidado do projeto:** título-conclusão gerado precisa ser calculado do dado, não fixo, ou fica errado quando o mês muda. **(inferência)**
2. **Hierarquia tipográfica**: 3-4 tamanhos no máximo (título do bloco, título do gráfico, rótulo de dado, nota). Pesos em vez de muitas cores.
3. **Rótulos diretos** sempre que couber; remover eixo y quando cada barra tem valor escrito (Tufte: menos tinta). [V Datawrapper] [V Tufte: maximizar a razão dado-tinta, https://spectrum.ieee.org/tufteisms]
4. **Números tabulares** (`font-variant-numeric: tabular-nums`) para colunas e KPIs que se atualizam, evitando que os dígitos "pulem". Few sobre alinhamento de números em tabelas.
   [V] MDN: `tabular-nums` deixa todos os dígitos com a mesma largura, para alinhar em colunas https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-numeric ; Few sobre alinhamento [M] (livro).
5. **Tamanho para TV a 3 m** (sem norma primária achada). Regra de ótica **(inferência)**: para legibilidade confortável, altura de letra ≈ distância/200-250; a 3 m, ~12-15 mm de altura de maiúscula. Numa 4K de 49" ultrawide, isso é da ordem de **≥ 24-28 px CSS no corpo mínimo e 48-72+ px nos KPIs** se a tela estiver em escala 100% em 3840 px; confirme medindo na TV real. O projeto tem modo TV (D56), então é o lugar certo para esses tokens.
6. **Evite texto rotacionado e abreviações obscuras**; barras horizontais deixam rótulos longos (nomes de cliente) legíveis. [M] Knaflic, Datawrapper.

## 9. Erros comuns
- 3D, pizza/rosca com muitas fatias, medidores, efeitos de sombra/gradiente: NN/g lista pizza, rosca, treemap, gauge e 3D como más escolhas para decisão rápida. [V] NN/g.
- **Chartjunk** e razão dado-tinta baixa (Tufte): grades fortes, bordas em todo gráfico, fundo decorativo. [V] "Credibility vanishes in clouds of chartjunk" e maximizar o data-ink ratio https://spectrum.ieee.org/tufteisms ; Few, Pitfall #11 (decoração inútil) https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf
- **Eixo truncado em barra**; **eixo duplo**: ver §4 e §3. [V Datawrapper dual axis]
- **Legenda longe do dado**; use rótulo direto. [V Datawrapper]
- **Treze armadilhas de Few** [V-corrigido: a lista de memória estava errada em vários itens; esta é a literal do PDF https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf]: (1) exceder os limites de uma única tela; (2) dar contexto insuficiente aos dados; (3) mostrar detalhe ou precisão em excesso; (4) expressar medidas de forma indireta; (5) escolher meio de exibição inadequado; (6) introduzir variedade sem sentido; (7) usar meios de exibição mal desenhados; (8) codificar dados quantitativos de forma imprecisa; (9) organizar mal os dados; (10) destacar mal o que é importante (se tudo é visualmente forte, nada se destaca); (11) poluir a tela com decoração inútil; (12) usar mal ou em excesso a cor; (13) desenhar uma exibição pouco atraente. Não existe "interatividade que atrapalha" na lista.
- **Cor demais / cor sem significado**; **densidade sem hierarquia** (tudo do mesmo tamanho): é o sintoma mais provável do "desorganizado" que o responsável sente. **(inferência)**

## 10. Animação e transição
1. **Ajuda**: transição curta ao trocar o mês/filtro mostra *o que mudou* (barra crescendo/encolhendo). [V-corrigido] Heer & Robertson (2007) https://homes.cs.washington.edu/~jheer/files/2007-AnimatedTrans-InfoVis.pdf (resumo: https://idl.uw.edu/papers/animated-transitions): dois experimentos mostram que transições animadas **bem desenhadas** melhoram significativamente a percepção; animação *em etapas* (staged) foi preferida e quase sempre mais precisa; mas "animation is no guarantee of improved performance" e pode enganar se violar a semântica dos dados, e em gráfico de dispersão a animação em etapas aumentou o erro de rastrear um alvo. **A faixa "200-400 ms" do texto original não vem do artigo**: ele recomenda cerca de 1 s (citando Robertson et al.), podendo ser mais rápido se o movimento for mínimo, e os experimentos usaram 1,25 s e 2 s. Para o dash-asten, 200-400 ms vira **(inferência)**; teste na TV.
2. **Atrapalha**: animação contínua, rotação automática de telas rápida demais, contadores subindo, pulsos. Competem pela atenção periférica e dificultam leitura a distância. NN/g/Few: movimento é um atributo pré-atentivo forte, então só deve sinalizar o que exige ação. [V NN/g sobre pré-atentivos] [V Heer & Robertson §2: movimento atrai a atenção e é percebido facilmente na visão periférica]
3. **TV**: se houver rotação entre telas, ≥ 20-30 s por tela e com indicador de progresso; melhor evitar rotação e caber tudo numa tela. **(inferência)**
4. Respeitar `prefers-reduced-motion`. [V-corrigido] WCAG 2.1 SC 2.3.3 é nível **AAA** e trata de animação de movimento *disparada por interação* (pode ser desligada, salvo se essencial); cita `prefers-reduced-motion` como forma de atender https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html . Animação automática/contínua não é coberta por esse critério (não conferi o 2.2.2).

## 11. Exemplos de referência
- **IBM Carbon, data visualization / dashboards** (presentation vs. exploration). [V] https://carbondesignsystem.com/data-visualization/dashboards/
- **Financial Times Visual Vocabulary** (qual gráfico para qual relação; 9 categorias). [V] https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary
- **IBCS Standards** (SUCCESS = Say, Unify, Condense, Check, Express, Simplify, Structure). [V-corrigido] ibcs.com/standards só confirma "sete áreas, acrônimo SUCCESS" https://www.ibcs.com/standards/ ; a lista veio de fonte secundária aberta (https://www.thedataschool.co.uk/gabriela-scherbinek/ibcs-r-what-it-is-and-why-it-matters). O texto integral da norma v2.0 é PDF restrito a membros/livro, não aberto.
- **Few, bullet graph spec** [V] https://www.perceptualedge.com/articles/misc/Bullet_Graph_Design_Spec.pdf . [V-corrigido] a página https://www.perceptualedge.com/examples.php é uma coleção de **críticas a exemplos mal desenhados** (20 miniaturas), não a "Dashboard Design Competition"; não achei página da competição aberta.
- **Atlassian / Jira dashboards, Zendesk Explore, Grafana** como referência de painéis de suporte: **não verifiquei** guias oficiais de design desses produtos nesta sessão; tratar como lacuna. Para suporte em TV, a prática descrita (poucos números gigantes, fila e SLA em risco) vem de Few/NN/g, não de um guia específico.
- Gallery Datawrapper para dot plot (e 23 tipos de gráfico; small multiples e range plot não aparecem nessa página): https://www.datawrapper.de/charts [V]; Observable Plot https://observablehq.com/plot/ [M] (a página devolveu 429 na verificação).

---

## 12. Guias de design systems e ferramentas
Todas as páginas abaixo foram abertas em 2026-10-15 e o conteúdo conferido [V]. O que é minha leitura para o dash-asten está marcado **(inferência)**. Páginas que não consegui abrir ou que não trazem o dado estão listadas em "Não achei", no fim da seção.

### 12.1 GOV.UK / Analysis Function
1. **Barras ordenadas por valor**, salvo ordem natural (idade, tempo): "Always rank bars by value, unless there is a natural order". [V] https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-charts/
2. **Eixo numérico de barra nunca truncado**; em linha, quebrar o eixo é aceitável. [V] mesma página.
3. **Barras agrupadas: no máximo 4 por grupo; pilha: no máximo 4 categorias**; rotular a pilha direto em vez de legenda; linhas também rotuladas direto. Mais de 4 linhas: small multiples. [V] mesma página.
4. **Evitar eixo duplo**: "easily misinterpreted"; separar em gráficos distintos. Reforça a §3. [V] mesma página.
5. **Barras horizontais quando o nome da categoria é longo**; texto sempre horizontal; fonte sem serifa; espaço entre barras menor que a largura da barra. [V] mesma página.
6. **Lacuna nos dados: deixar quebra na linha**, não ligar os pontos (reforça §6.5). [V] mesma página.
7. **Tamanho de fonte**: a página diz "use a large enough font for all labels", mas que não é possível sugerir um mínimo específico. [V] mesma página. Para dashboards: texto de pelo menos 12 pt (ou equivalente), redimensionável a 200%, WCAG 2.2 AA, poucas cores e fontes, minimizar rolagem. [V] https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-testing-dashboards-for-design-and-accessibility/ (o "12 pt" é para uso em tela de computador/celular, não para TV).
8. **Sempre deixar claro a que data/período o dashboard se refere** e registrar mudanças de definição com nota. [V] https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-building-and-managing-dashboards/ . A mesma página adverte que "dashboards rarely meet full accessibility requirements" e que os dados devem existir também em outra forma (tabela/arquivo). **(inferência)**: no dash-asten, manter o export/tabela já cobre isso.
9. A página de dashboards não fixa número de visuais nem tamanho de texto. [V] mesma página.

### 12.2 Ferramentas de dashboard
10. **Power BI**: "put the highest level of data at the top left"; cartão (card) para número importante, com contexto; tudo numa tela, sem barra de rolagem; "remove all but essential information"; usar modo tela cheia ao apresentar; monitor grande permite mais conteúdo que tablet. [V] https://learn.microsoft.com/en-us/power-bi/create-reports/service-dashboards-design-tips
11. **Power BI**: manter a mesma escala, ordem e cor por dimensão entre gráficos; não misturar períodos (um gráfico com "último mês" ao lado de outro filtrado num mês específico); ordenar por medida para destacar maior/menor, por eixo para achar categoria; mostrar números abreviados ("3,4 milhões") e no máximo 3-4 dígitos. [V] mesma página.
12. **Tableau**: "Author at your final display size" (projetar já no tamanho final de exibição), colocar a visão mais importante no canto superior esquerdo, e "limit the number of views you include in your dashboard to two or three". [V] https://help.tableau.com/current/pro/desktop/en-us/dashboards_best_practices.htm
13. **Tableau Blueprint**: layout em Z/jornal (importante no alto/esquerda), KPIs maiores que o resto, espaço em branco e padding no lugar de linhas de grade para separar seções, 3 níveis de fonte (topo, médio, baixo), cores base neutras e acento/alerta com parcimônia, título e subtítulo em cada bloco. [V] https://help.tableau.com/current/blueprint/en-us/bp_visual_best_practices.htm
14. **Grafana**: "a dashboard should tell a story or answer a question"; "reduce cognitive load, not add to it"; progressão lógica do geral para o específico; uma linha por serviço; azul = bom, vermelho = ruim com limiares (thresholds); evitar gráficos empilhados, que podem "mislead and hide important data"; descrição do propósito do painel. [V] https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/best-practices/ . A página não trata de modo TV/quiosque nem de tamanho de texto.

### 12.3 Design systems
15. **Atlassian**: limitar a 5-6 cores categóricas agrupando o resto; "avoid using just color to communicate meaning": usar formas, textura, padrão ou rótulo direto; separador (espaço/borda) entre elementos adjacentes porque as cores não têm contraste suficiente entre si; tokens de status (sucesso, aviso, perigo, neutro) com variante forte para valores extremos; eixos e texto usam tokens de texto/borda, não de gráfico. [V] https://atlassian.design/foundations/color/data-visualization-color
16. **IBM Carbon, cor**: 14 cores categóricas numa sequência que maximiza contraste entre vizinhas; paletas sequenciais monocromáticas (claro = menor no tema claro; invertido no escuro); 4 cores de status (vermelho, laranja, amarelo, verde); desencoraja múltiplos gradientes por serem frequentemente inacessíveis. [V] https://carbondesignsystem.com/data-visualization/color-palettes/
17. **IBM Carbon, tipos de gráfico**: barra simples compara valores discretos; barra empilhada mostra contribuição proporcional dentro de uma categoria; linha para tendência; sparkline para espaço compacto; meter/bullet para valor contra meta. A página não traz limites numéricos nem regra de ordenação. [V] https://carbondesignsystem.com/data-visualization/simple-charts/
18. **Android TV (Material)**: distância média de visualização de **3 m (10 pés)**; texto e elementos devem ser grandes e o volume de texto limitado; fonte Roboto "otimizada para legibilidade à distância"; tipografia maior que em outras plataformas; sem serifa em corpo e rótulos. [V] https://developer.android.com/design/ui/tv/guides/foundations/design-for-tv e https://developer.android.com/design/ui/tv/guides/styles/typography
19. **Android TV, cor**: "Using darker colors saves power. Avoid using white background unless necessary"; alto contraste texto/fundo; não depender só de cor; projetar e testar as cores no modo de imagem "Standard" (o "Vivid" satura). [V] https://developer.android.com/design/ui/tv/guides/foundations/color-on-tv . Apoia a inferência da §7.8 (fundo escuro).

### 12.4 Tamanho de texto em TV a 2-4 m
20. **Apple tvOS (HIG, Typography)**: tamanho padrão **29 pt** e **mínimo 23 pt**. Tabela de estilos: Title 1 76, Title 2 57, Title 3 48, Headline 38, Callout 31, Body 29, Caption 1 25, Caption 2 23 pt. [V] https://developer.apple.com/design/human-interface-guidelines/typography (lido pelo JSON da própria página: https://developer.apple.com/tutorials/data/design/human-interface-guidelines/typography.json , seção "Ensuring legibility"). Os pt do tvOS são de uma tela lógica de 1080 de altura **(inferência; não conferi na página)**. Proporcional: mínimo 23/1080 ≈ 2,1% da altura da tela, padrão ≈ 2,7%. Numa tela com 1440 px de altura isso dá ≈ 31 px (mínimo) e ≈ 39 px (corpo); em 2160 px, ≈ 46 e ≈ 58 px. **(inferência)** Ver a divergência abaixo.
21. **Altura de caractere por distância (ADA 2010, §703.5.5, Tabela 703.5.5)**: sinal a 40-70" do piso: 5/8" (16 mm) até 72" e mais 1/8" por pé acima disso; a 70-120" do piso: 2" (51 mm) até 180" (15 pés, 4,6 m) e mais 1/8" por pé depois. Altura medida pela maiúscula "I". Também: contraste claro-sobre-escuro ou escuro-sobre-claro, fonte convencional (sem itálico, script, decorativa), largura do "O" entre 55% e 110% da altura do "I". [V] https://www.corada.com/documents/2010ADAStandards/703-5 (cópia comercial do texto; a fonte oficial é o US Access Board, que não abri). A norma é para **placas fixas**, não para telas: use como referência de ordem de grandeza, não como requisito. **(inferência)** a 3 m de uma tela montada acima de 70" do piso: mínimo da norma = 51 mm de altura de maiúscula.
22. **Cálculo para o caso (inferência, depende do monitor)**: numa 49" 32:9 de 5120x1440 o pixel mede ≈ 0,23 mm; uma maiúscula de 13 mm (regra distância/225 da §8.5) pede ≈ 56 px de altura de maiúscula, ou seja, fonte de ≈ 75-80 px. Uma 4K 16:9 de 55" tem pixel ≈ 0,32 mm. Medir o pixel da TV real antes de fixar tokens.

### Divergências com as seções 1-11
- **Divergência: eixo duplo (§3 evita).** Power BI diz: "If you need to mix measurement scales, choose a visualization that allows the use of a second axis". GOV.UK e Datawrapper dizem para evitar. Mantenho o relatório: duas fontes convergem contra, Power BI é a única a favor.
- **Divergência: quantidade de blocos (§1.7 fala em ~5-9 itens de primeiro nível; "Aplicação" mantém vários gráficos).** Tableau recomenda 2-3 visões por dashboard. É a única fonte numérica achada; sustenta a opção de paginar por pergunta, não espremer tudo numa tela.
- **Divergência: série por barra agrupada (§4.3 diz ~2).** GOV.UK aceita até 4 barras por grupo e 4 categorias por pilha. Para o dash-asten (2 séries) não muda nada; o limite de 4 por pilha confirma a §5.2 (3-5), no extremo baixo.
- **Divergência: barras empilhadas (§5 aceita com limite).** Grafana desaconselha empilhado ("misleading, and hide important data"). GOV.UK aceita com no máximo 4 categorias e rótulo direto. Mantenho o relatório com o limite de 4.
- **Divergência: rótulos de valor (§4.5 e §8.3 pedem rótulo direto com valor).** Power BI manda remover rótulos de dados desnecessários, porque barras já se entendem sem o número. GOV.UK pede rótulo direto de pilhas e linhas. Em TV a 3 m, onde não dá para estimar valor pelo eixo, o valor escrito continua útil **(inferência)**.
- **Divergência: tamanho de texto (§8.5 fala em ≥ 24-28 px no corpo e 48-72+ px nos KPIs numa 4K ultrawide).** Pelo tvOS, o mínimo é ≈ 2,1% da altura da tela (≈ 31 px em 1440 de altura, ≈ 46 px em 2160), mais que o dobro do piso do relatório em tela de 2160. Pela conta do item 22, 24-28 px em 5120x1440 dá maiúscula de ≈ 4-5 mm, bem abaixo dos 13 mm da própria regra da §8.5. Recomendo tratar 24-28 px como piso absoluto de nota/rodapé e subir corpo e rótulos de dado para a faixa do tvOS; confirmar na TV real.
- **Divergência: GOV.UK "12 pt".** Vale para leitura de perto em computador, não para TV; não conflita com a §8.5, só não se aplica.

### Recomendações novas mais úteis para o caso
- Projetar já no tamanho final da TV e testar nela (Tableau, Android TV).
- Fundo escuro suave e testar no modo de imagem "Standard" (Android TV).
- Cinza/neutro como base e acento só para o desvio; nunca só cor, sempre também sinal, forma ou rótulo (Atlassian, Android TV, Tableau).
- Máx. 4 categorias por pilha e 4 barras por grupo (GOV.UK); 5-6 cores categóricas no total (Atlassian).
- Deixar escrito o período e o mês de comparação em cada bloco e não misturar períodos entre gráficos (GOV.UK, Power BI).
- Manter tabela/dado alternativo disponível (GOV.UK).

### Não achei / não abri
- **Zendesk Explore**: a página oficial do dashboard de Support só descreve as abas (Tickets, Backlog, Unsolved tickets, SLAs, Group SLAs); não achei recomendação oficial de design. https://support.zendesk.com/hc/en-us/articles/4408835985434-Overview-of-the-Zendesk-Support-dashboard
- **Jira Service Management**: não encontrei guia oficial de dashboards de suporte; não aberto.
- **Material Design 3 (data viz/charts e tabela de tokens de tipografia)**: as páginas m3.material.io devolveram só o título (renderizadas por JavaScript); tamanhos em sp do Android TV **não conferidos**. A página de tipografia do Android TV não traz números.
- **Atlassian**: a página de tipos de gráfico (além da de cor) e o guia de data visualization em atlassian.design/foundations/data-visualization retornaram 404.
- **GOV.UK**: a página "dashboards" citada no pedido não existe com esse nome; usei "building and managing" e "testing for design and accessibility". Não abri "examples" nem "dashboard software".
- **Android TV**: não achei valores de margem de segurança (overscan); a página de grid retornou 404.
- **US Access Board (ada.gov / access-board.gov)**: não abri a fonte oficial da Tabela 703.5.5; usei cópia de terceiros.
- Fonte primária de tamanho mínimo de texto específico para dashboard de TV a 2-4 m: **não existe**, que eu tenha encontrado. Os números acima são de guias de interface de TV (tvOS) e de sinalização (ADA), mais conta minha.

---

# Aplicação ao dash-asten

## Topo (total + barra de situação)
- Total como número grande, uma só frase de contexto ("N chamados em jun/26, X% finalizados"). A barra empilhada por situação é uma composição de um todo, aceitável, mas: limitar a 4-5 famílias visíveis (as situações restantes agrupadas **com detalhe acessível**, respeitando D34), rótulo direto com valor, cor semântica ordenada. Porquê: §5, Carbon hierarquia.

## 12 KPIs com selo de variação
- Reduzir o nível principal para 4-6 KPIs grandes (os que a direção usa para decidir) e deixar o restante numa faixa secundária menor. Cada KPI: número grande, rótulo, variação em texto pequeno com o mês de referência escrito, seta + cor **semântica por métrica** (subir é ruim para vencidos, bom para finalizados), cinza quando neutro. Sparkline ao lado só nos principais. Porquê: §2.
- Tudo em tabular-nums e tamanhos do modo TV (§8).

## "No mês" — 5 barras agrupadas (cliente, operador, área, atividade, área superior)
- Trocar barra agrupada com contorno tracejado por **barra do mês atual + tick fino do mês comparado** (ou haltere). Ordenar por valor, top N + acesso ao restante, rótulo direto, sem legenda por gráfico (uma legenda global). Se as duas séries (finalizados × não finalizados) são partes de um todo, uma **barra empilhada de 2 segmentos** (neutro + destaque) é mais clara que duas barras agrupadas. Títulos com a pergunta/conclusão. Porquê: §4, §8.
- Cinco gráficos do mesmo tipo seguidos viram parede; agrupe por pergunta (quem/onde) e reduza a 2-3 visíveis por padrão com os demais em abas. **(inferência)**

## Em atraso por meses desde a abertura (faixas 1, 2-3, 4-6, 7+)
- Barras verticais ou horizontais de uma só matiz sequencial (claro → escuro conforme a idade), valor escrito, destaque na faixa 7+. Porquê: §7 (faixa ordinal = escala sequencial).

## Cliente × Situação (empilhada)
- Se mantiver empilhada: ≤ 4-5 famílias, ordem fixa, cores consistentes com o topo (mesma situação = mesma cor em toda a página), ordenar clientes pelo total ou pela família crítica. Opção 100% se a pergunta for proporção. Alternativa: tabela com barras embutidas. Porquê: §5, §7.

## Operador × Atraso (empilhada por faixa)
- Escala sequencial de uma só cor, ordenar por atraso severo (7+), rótulo do total. Porquê: §5.6.

## Área × SLA
- **Dois painéis alinhados, uma linha por área, mesma ordem** (esquerda: % no SLA dos finalizados em escala 0-100% fixa, com marcador de meta; direita: contagem de vencidos dos não finalizados). Cada painel com seu título, unidade e população. Destaque de cor só nas áreas fora da meta. Alternativa compacta: tabela com barras embutidas. Nunca eixo duplo nem barras de unidades diferentes no mesmo eixo. Porquê: §3 (Datawrapper side-by-side; Cleveland & McGill; Few; Tufte).

## Cliente × Tempo médio (resolução e até o aceite, em dias)
- Mesma unidade (dias), então pode ficar no mesmo eixo, mas são **duas etapas de um mesmo fluxo**: usar **dot plot com dois pontos por cliente ligados por linha (haltere)** ou duas colunas lado a lado. Ordenar por tempo de resolução, rótulo direto, linha de meta/mediana se existir. Porquê: §4.

## Ao longo do tempo (7 minigráficos)
- Small multiples em grade regular: linha (ou barras finas) em vez de área, **escala independente por painel** (unidades diferentes), valor atual grande + marcador no último ponto, mês parcial marcado diferente, sem grade/eixos pesados. Mesma altura/largura em todos. Porquê: §6.

## Comparar (2 a 6 meses)
- Para 2 meses: haltere/dot plot ou barra + tick. Para 3-6: small multiples (um painel por métrica, meses no eixo x, ordem cronológica, mês de referência em destaque, os demais em cinza) em vez de barras agrupadas com 6 séries (limite ~2). Porquê: §4, §6.

## Estrutura geral da página
- Três faixas por pergunta: **(1) Como estamos?** (total + 4-6 KPIs), **(2) Onde está o problema?** (atrasos, Área × SLA, Operador × Atraso), **(3) Estamos melhorando?** (Ao longo do tempo). Menos caixas, uma grade só, cartões só por faixa, espaço em branco entre faixas, uma legenda global, paleta curta (azul neutro + cinza + 1 cor de alerta). Modo TV com tokens maiores. Se a página não couber numa tela a 3 m, paginar por pergunta em vez de espremer. Porquê: §1, §7, §8.

---

# Fontes
- Few, S. *Information Dashboard Design* (2013); artigos em https://www.perceptualedge.com/ (Common Pitfalls: https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf [V]; bullet graph spec: https://www.perceptualedge.com/articles/misc/Bullet_Graph_Design_Spec.pdf [V]; cor: https://www.perceptualedge.com/articles/visual_business_intelligence/rules_for_using_color.pdf [V]; metáfora do painel: https://www.perceptualedge.com/articles/dmreview/dashboard_design.pdf [V]); livro [M]
- Tufte, E. *The Visual Display of Quantitative Information*, *Envisioning Information*, *Beautiful Evidence*: páginas dos livros https://www.edwardtufte.com/book/the-visual-display-of-quantitative-information/ e https://www.edwardtufte.com/book/envisioning-information/ [V, só como lista de temas]; sparklines https://www.edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/ [V]; os endereços antigos /tufte/books_* não foram abertos
- Knaflic, C. *Storytelling with Data* (2015) [M, livro]; blog [V]: https://www.storytellingwithdata.com/blog/stacked-bars ; https://www.storytellingwithdata.com/blog/2016/2/1/be-gone-dual-y-axis ; https://www.storytellingwithdata.com/blog/2020/3/5/transforming-slide-titles ; https://www.storytellingwithdata.com/blog/2020/12/9/what-is-a-dot-plot ; https://www.storytellingwithdata.com/blog/2015/03/the-biggest-bang-for-your-buck ; https://www.storytellingwithdata.com/blog/2020/1/6/swdchallenge-small-multiples
- IBCS Standards: https://www.ibcs.com/standards/ [V só para "SUCCESS"]; notação de cenários: https://www.ibcs.com/wp-content/uploads/2018/01/UN-3.2_More-scenarios_2018-01-23_rh.pdf [V, proposta de 2018]
- Cleveland & McGill (1984), JASA: https://doi.org/10.1080/01621459.1984.10478080 [artigo não aberto]; ranking das tarefas [V] em https://info3312.infosci.cornell.edu/slides/04-graphical-perception.html
- Heer & Robertson (2007), Animated Transitions: https://homes.cs.washington.edu/~jheer/files/2007-AnimatedTrans-InfoVis.pdf [V]; https://idl.uw.edu/papers/animated-transitions [V]
- Cairo, A. *How Charts Lie* (2019) [M]
- FT Visual Vocabulary: https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary [V]
- Datawrapper: academy (zero: https://www.datawrapper.de/academy/why-our-column-and-bar-charts-start-at-zero ; dot/range/arrow: https://www.datawrapper.de/academy/category/dot-charts ; stacked: https://www.datawrapper.de/academy/how-to-create-a-stacked-bar-chart ; small multiples: https://www.datawrapper.de/blog/what-to-consider-when-creating-small-multiple-line-charts) [V]; dual axis https://www.datawrapper.de/blog/dualaxis/ [V]; texto em dataviz https://www.datawrapper.de/blog/text-in-data-visualizations [V]; cores https://www.datawrapper.de/blog/colors-for-data-vis-style-guides [V]
- IBM Carbon dashboards: https://carbondesignsystem.com/data-visualization/dashboards/ [V]
- NN/g dashboards e pré-atentivos: https://www.nngroup.com/articles/dashboards-preattentive/ [V]
- W3C WCAG 2.1 SC 1.4.11: https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html [V]; SC 2.3.3: https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html [V]; SC 1.4.3: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html [V]
- ColorBrewer: https://colorbrewer2.org [V]
- GOV.UK Analysis Function: charts https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-charts/ ; building and managing dashboards https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-building-and-managing-dashboards/ ; testing dashboards for design and accessibility https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-testing-dashboards-for-design-and-accessibility/ [V]
- Grafana, dashboard best practices: https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/best-practices/ [V]
- Microsoft Power BI, design tips: https://learn.microsoft.com/en-us/power-bi/create-reports/service-dashboards-design-tips [V]
- Tableau: https://help.tableau.com/current/pro/desktop/en-us/dashboards_best_practices.htm ; Blueprint https://help.tableau.com/current/blueprint/en-us/bp_visual_best_practices.htm [V]
- Atlassian Design System, cor em dataviz: https://atlassian.design/foundations/color/data-visualization-color [V]
- IBM Carbon: cores https://carbondesignsystem.com/data-visualization/color-palettes/ ; gráficos simples https://carbondesignsystem.com/data-visualization/simple-charts/ [V]
- Android TV: https://developer.android.com/design/ui/tv/guides/foundations/design-for-tv ; https://developer.android.com/design/ui/tv/guides/foundations/color-on-tv ; https://developer.android.com/design/ui/tv/guides/styles/typography [V]
- Apple HIG, Typography (tvOS 29 pt padrão, 23 pt mínimo): https://developer.apple.com/design/human-interface-guidelines/typography [V, via JSON da página]
- ADA 2010 Standards, §703.5 (cópia): https://www.corada.com/documents/2010ADAStandards/703-5 [V]
- Zendesk, visão geral do dashboard de Support: https://support.zendesk.com/hc/en-us/articles/4408835985434-Overview-of-the-Zendesk-Support-dashboard [V]

Lacunas: sem guia oficial verificado de painéis de suporte em TV (Zendesk/Jira/Grafana); sem norma primária para tamanho de fonte em TV; a URL antiga do Datawrapper sobre eixo truncado dava 404; o endereço atual (https://www.datawrapper.de/academy/why-our-column-and-bar-charts-start-at-zero) abriu e foi usado; resta [M] o que depende de livros (Few 2013, Tufte, Knaflic 2015, Cairo 2019), de Observable Plot (HTTP 429) e do texto integral do IBCS 2.0 (restrito).

---

# Acréscimos da verificação (fontes clássicas, 2026-10-15)
Tudo abaixo vem de página aberta; o link está em cada item.

## A. Comparar dois períodos (haltere, barra com marcador)
- **Dot plot conectado (haltere)** serve para comparar dois períodos ou grupos; o eixo não precisa começar em zero; cuidado: é menos familiar, então rotule e explique a leitura, ordene com critério e use cor só para a direção da mudança. https://www.storytellingwithdata.com/blog/2020/12/9/what-is-a-dot-plot
- **Range plot** mostra a diferença entre duas variáveis e é a alternativa do Datawrapper a barras agrupadas; **arrow plot** mostra como um valor mudou entre dois anos; dot plot: no máximo 3 pontos por linha (exceção 5). https://www.datawrapper.de/academy/category/dot-charts e https://www.datawrapper.de/academy/how-to-create-a-dot-plot
- **Bullet graph com marcador comparativo**: Few define a medida comparativa como linha curta perpendicular, menos dominante que a medida principal, podendo ser a meta ou a mesma medida num ponto passado (ex.: um ano atrás); a barra principal parte de zero. https://www.perceptualedge.com/articles/misc/Bullet_Graph_Design_Spec.pdf
- **Cores do período anterior** (IBCS, proposta 2018): real em sólido escuro, anterior em cinza mais claro ("the later the darker"), plano só contorno. https://www.ibcs.com/wp-content/uploads/2018/01/UN-3.2_More-scenarios_2018-01-23_rh.pdf
- **Slope** (FT) só para 2-3 pontos no tempo. https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary

## B. Duas medidas de unidades diferentes por categoria
- Knaflic: não mostrar o segundo eixo e rotular direto os pontos; ou separar os gráficos na vertical com o mesmo eixo comum e um eixo y próprio cada; ou converter para unidade comum (variação %), que só funciona se as escalas forem parecidas. https://www.storytellingwithdata.com/blog/2016/2/1/be-gone-dual-y-axis
- Datawrapper: 4 alternativas (lado a lado, indexado, priorizar e rotular, scatter conectado); estudo Isenberg et al. 2011: gráfico sobreposto pior em precisão e tempo. https://www.datawrapper.de/blog/dualaxis
- Para o dash-asten isso reforça "Área × SLA em dois painéis alinhados" (§3). Small multiples com escala própria exigem sinalização explícita (§6.2).

## C. Barras empilhadas
- Só o segmento da base é fácil de comparar entre barras; a versão 100% dá duas bases; empilhada serve quando o total da barra é o foco; ponha a categoria principal junto da base; separadores brancos entre segmentos. https://www.storytellingwithdata.com/blog/stacked-bars
- Datawrapper: poucas colunas (5-6) por legibilidade. https://www.datawrapper.de/academy/how-to-create-a-stacked-bar-chart
- Cleveland & McGill (via slides): subir na hierarquia, ex. trocar barra empilhada por dot plot agrupado; a ressalva é que a hierarquia vale para extrair valores precisos, outros objetivos (parte-todo) podem justificar outro gráfico. https://info3312.infosci.cornell.edu/slides/04-graphical-perception.html

## D. Outros achados úteis
- Few, Pitfall #10: se tudo no painel é igualmente vistoso, nada se destaca; os olhos devem ser puxados ao que mais precisa de atenção agora. https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf
- Few, bullet: faixas qualitativas no máximo 5 (ideal 3), em intensidades de um só matiz, escuro = pior; rótulo à esquerda, 100% preto. https://www.perceptualedge.com/articles/misc/Bullet_Graph_Design_Spec.pdf
- Datawrapper small multiples: ordenar painéis por critério explícito; como cada painel tem título, a cor deixa de identificar a linha e pode destacar painéis ou agrupar tendências. https://www.datawrapper.de/blog/what-to-consider-when-creating-small-multiple-line-charts
- Tufte, sparklines: proporção que dê inclinações de ~45 graus (Cleveland); a página cita ainda que telas têm só 10-15% da resolução do papel, o que limita sparklines minúsculas em monitor (argumento a favor de sparklines maiores na TV: **inferência** minha). https://www.edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/
- Transição entre gráficos: animação em etapas (primeiro rescala eixo, depois muda o objeto) foi preferida; cuidado com mudança simultânea de escala e valor. https://homes.cs.washington.edu/~jheer/files/2007-AnimatedTrans-InfoVis.pdf

---

# Registro de verificação
Legenda: M = memória, V = fonte aberta confirma, VC = V-corrigido. Seções entre parênteses.

| Afirmação (curta) | Antes | Depois | Link aberto |
|---|---|---|---|
| Few: dashboard = info mais importante numa tela, "at a glance" (1.1) | M | V | https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf |
| Few: eliminar bordas/Gestalt (1.5) | M | M (só livro) | sem fonte aberta; Pitfall #11 confirmou só decoração |
| Tufte: razão dado-tinta / não encaixotar; Few "não encaixotar" (1.10) | M | VC (Tufte V, Few M) | https://spectrum.ieee.org/tufteisms |
| IBCS: comparar real × anterior × meta (2.2) | M | V | https://www.ibcs.com/wp-content/uploads/2018/01/UN-3.2_More-scenarios_2018-01-23_rh.pdf |
| IBCS/Few: cor semântica de variação (2.3) | M | Few V; IBCS vermelho/verde M | https://www.perceptualedge.com/articles/visual_business_intelligence/rules_for_using_color.pdf |
| Sparkline junto do número, marcador no último ponto (2.5) | M | V | https://www.edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/ |
| Few: cor com parcimônia (2.7) | M | V | rules_for_using_color.pdf (Regras #3 e #5) |
| Bullet substitui gauge (2.8) | M (Few) | V | https://www.perceptualedge.com/articles/misc/Bullet_Graph_Design_Spec.pdf |
| Tabela com barras embutidas, Few/Tufte (§3) | M | M | livros; sem fonte aberta |
| Cleveland & McGill: posição em escala comum é a mais precisa (§3, 4.1) | M | V (via slides, não o artigo) | https://info3312.infosci.cornell.edu/slides/04-graphical-perception.html |
| FT "Deviation/Change" para haltere (4.1) | M | VC: categoria não existe; dumbbell não listado | https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary |
| IBCS: "anterior" mais discreto que "real" (4.2) | M | V (proposta 2018) | UN-3.2 PDF acima |
| Máximo ~2 séries por barra agrupada (4.3) | M | M | sem fonte aberta com o número |
| Ordenar por valor, Knaflic/Datawrapper (4.4) | M | M | sem fonte aberta específica |
| Barras começam em zero (4.6) | M | V (Cairo M) | https://www.datawrapper.de/academy/why-our-column-and-bar-charts-start-at-zero |
| Empilhada: só a base é comparável (5.1) | M | V | https://www.storytellingwithdata.com/blog/stacked-bars |
| Absoluto vs 100% (5.3) | M | V | idem |
| FT Part-to-whole (5.5) | M | V | FT visual-vocabulary acima |
| Faixas ordinais = escala sequencial, Brewer (5.6, 7.1) | M | V | https://colorbrewer2.org |
| Small multiples, Tufte (6.1, §3) | M | V (tema; regra de escala em Knaflic) | https://www.storytellingwithdata.com/blog/2020/1/6/swdchallenge-small-multiples |
| Escala independente por painel quando unidades diferem (6.2) | M | VC: evitar quando possível; sinalizar | https://www.datawrapper.de/blog/what-to-consider-when-creating-small-multiple-line-charts |
| Destacar último ponto/min/máx (6.3) | M | V | página Tufte de sparklines acima |
| IBCS: período parcial/previsão (6.5) | M | VC: previsão=hachurado confirmado; "mês parcial" é inferência | UN-3.2 PDF |
| Knaflic: cor estratégica, cinza (7.3) | M | V | https://www.storytellingwithdata.com/blog/2015/03/the-biggest-bang-for-your-buck |
| Few: não usar cor de alerta como categórica (7.5) | M | V (essência) | rules_for_using_color.pdf |
| WCAG 1.4.3: 4.5:1 texto normal (7.6) | M | V (+3:1 texto grande) | https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html |
| Verde/vermelho falham em daltonismo (7.7) | M | V | Common_Pitfalls.pdf (Pitfall #12) |
| Knaflic: título de ação (8.1) | M | V | https://www.storytellingwithdata.com/blog/2020/3/5/transforming-slide-titles |
| Tufte: menos tinta, rótulo direto (8.3) | M | V | https://spectrum.ieee.org/tufteisms |
| tabular-nums (8.4) | M | V (MDN); Few alinhamento M | https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-numeric |
| Texto rotacionado/abreviações, Knaflic/Datawrapper (8.6) | M | M | sem fonte aberta |
| Chartjunk, Tufte (§9) | M | V | https://spectrum.ieee.org/tufteisms |
| Treze armadilhas de Few (§9) | M | VC: lista de memória errada; lista literal incluída | Common_Pitfalls.pdf |
| Heer & Robertson: transição 200-400 ms melhora (10.1) | M | VC: paper recomenda ~1 s, testou 1,25 s e 2 s; staged melhor; ressalvas | https://homes.cs.washington.edu/~jheer/files/2007-AnimatedTrans-InfoVis.pdf |
| Movimento é pré-atentivo forte (10.2) | V(NN/g)+M(Few) | V (Heer §2) | idem |
| WCAG 2.3.3 / prefers-reduced-motion (10.4) | M | VC: nível AAA, animação por interação | https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html |
| FT Visual Vocabulary (§11) | M | V | FT visual-vocabulary acima |
| IBCS SUCCESS (§11) | M | VC: confirmado só "7 áreas"; lista por fonte secundária | https://www.ibcs.com/standards/ ; https://www.thedataschool.co.uk/gabriela-scherbinek/ibcs-r-what-it-is-and-why-it-matters |
| Few "Dashboard Design Competition" em examples.php (§11) | M | VC: a página é de críticas a exemplos ruins | https://www.perceptualedge.com/examples.php |
| Gallery Datawrapper / Observable Plot (§11) | M | Datawrapper V; Observable M (HTTP 429) | https://www.datawrapper.de/charts |
| Few, KPIs; Knaflic "focus attention"; "teste dos 5 segundos"; Few Show Me the Numbers (2.1, 1.6, 1.8) | M | M | só em livros / sem página aberta |
| Cairo, How Charts Lie (4.6) | M | M | livro |
