# Painel da reunião semanal — proposta para validar

**13/10/2026 · validação até 16/10** · Versão publicada: https://claude.ai/artifact/5BJd74ABZhB6Js18p44Y24

**Teste online, sem login:** https://dash-asten.vercel.app — enquanto a planilha real não chega, o app monta KPIs e gráficos automáticos a partir das colunas; os painéis específicos de cada aba vêm depois.

## Primeira versão

**Entra**
- Importar a planilha da semana; cada aba vira uma tela
- Painel pronto em cada aba, já montado para a nossa planilha
- Filtros em cada aba, com botão para limpar
- Esconder abas que não interessam na reunião
- Escolher quais colunas aparecem na tabela
- Visual pensado para TV, com as cores da Asten

**Fica para depois:** montar ou editar gráficos pela tela, renomear e reordenar abas, um filtro valendo para todas as abas, exportar imagem ou CSV, salvar preferências entre reuniões.

Tudo roda no navegador e a planilha não sai do computador. Cada carga é guardada por competência (mês de análise) para revisitar e comparar depois; hoje esse histórico fica no próprio navegador.

## Protótipo

Dados fictícios, com duas abas de exemplo (indicadores e projetos), porque ainda não sabemos o formato exato da planilha. Capturas em `docs/prototipo/`.

Para abrir: `git switch prototipo && cd prototype && npm install && npm run dev`

## Tecnologia

| Parte | Escolha | Por quê |
|---|---|---|
| Aplicação | React + TypeScript + Vite | Padrão de mercado para painéis; vira um site estático que roda em qualquer lugar. |
| Visual | shadcn/ui | Componentes prontos, com o código dentro do nosso projeto. |
| Gráficos | Recharts | Cobre linha, barra e progresso. Leve e gratuito. |
| Tabela | TanStack Table | Ordenação e escolha de colunas prontas. |
| Leitura do Excel | SheetJS | Lê todas as abas direto no navegador. |

Comparação completa em `docs/comparacao-stack.md`.

## Para validar

1. Escopo da primeira versão
2. Visual do protótipo na TV
3. Uma planilha real (pode ser cópia com os números trocados)
4. O que cada aba precisa mostrar
5. Definições: atrasado, concluído, período
6. Filtros de cada aba
7. Onde vai rodar: link com acesso restrito, servidor interno ou arquivo local
8. Uso do logo e das cores da Asten Suite

## Depois do ok

1. Validação, até 16/10
2. Fechar o formato da planilha com a planilha real
3. Construir: leitura, filtros e painéis, um de cada vez
4. Testar numa reunião de verdade, na TV
