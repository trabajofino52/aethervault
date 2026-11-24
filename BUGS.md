# BUGS — AetherVault

Registro de fallos detectados durante el despliegue y pruebas en produccion.

---

## BUG-001 — Build fallaba por modulo faltante ./data/coinTiers

- Severidad: Critica
- Estado: Resuelto
- Solucion: recrear/restaurar src/data/coinTiers.ts.

---

## BUG-002 — Archivos de datos eliminados en commit c0dfdd8

- Severidad: Critica
- Estado: Resuelto
- Causa raiz confirmada: el commit c0dfdd8 borro src/data/coinTiers.ts y
  src/data/top50CasinoGames.ts, pero src/App.tsx,
  src/components/StoreModal.tsx y src/components/Top50CasinoHub.tsx
  seguian importandolos.

- Diagnostico:
  git diff --name-status 40fa788 c0dfdd8 | grep '^D'
  Resultado:
    D  src/data/coinTiers.ts
    D  src/data/top50CasinoGames.ts

- Solucion aplicada:
  git checkout 40fa788 -- src/data/coinTiers.ts
  git checkout 40fa788 -- src/data/top50CasinoGames.ts

- Verificacion: bun run build -> 1717 modulos, dist/ generado.

- Prevencion: anadir bun run build como pre-commit hook o paso de CI.

---

## BUG-003 (mejora, no bug) — Bundle JS mayor de 500 kB

- Severidad: Baja
- Estado: Abierto (mejora futura)
- Detalle: dist/assets/index-*.js pesa 1.54 MB (410 kB gzip).
- Accion sugerida: implementar code-splitting con dynamic import() en rutas
  y componentes pesados (juegos, modales). Configurar
  build.rolldownOptions.output.codeSplitting en vite.config.ts.

---

## BUG-004 — Comando start usa node en vez de bun

- Severidad: Media
- Estado: Pendiente de verificar
- Detalle: package.json tiene "start": "NODE_ENV=production node server.ts",
  pero el proyecto se instalo con Bun. Si el servidor Debian no tiene Node
  instalado, bun run start fallara.
- Accion: decidir si se usa bun server.ts o se instala Node.js en el servidor.
