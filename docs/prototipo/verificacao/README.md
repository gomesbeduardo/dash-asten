# Verificação do protótipo (13/10/2026)

Scripts Playwright usados para gerar as capturas e as 11 checagens de interação citadas em `../../apresentacao-lider.md`.
O Playwright **não** é dependência do protótipo; instale-o numa pasta à parte.

```bash
cd prototype && npm run build && npx vite preview --port 4317 &   # servidor
mkdir -p /tmp/verif && cd /tmp/verif && npm init -y && npm i playwright@1.56
cp <repo>/docs/prototipo/verificacao/*.mjs . && mkdir -p out
node shoot.mjs out   # capturas 1920 / 1366 / 1024
node smoke.mjs out   # checagens de interação (esperado: 11 OK, sem erros de console)
```
Usa o Chrome do sistema (`/usr/bin/google-chrome`); ajuste `executablePath` se necessário.
