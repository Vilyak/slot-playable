# Pixi ECS

Базовый каркас игры: **PixiJS v8** + **bitECS** + **tsyringe** + **React / Redux Toolkit**.

## Скрипты

- `npm run assets:pack` — упаковка `raw_assets/` в атласы и codegen в `src/assets/generated/`
- `npm run dev` — pack + Vite dev server
- `npm run build` — production build

## Ассеты

Положи PNG в `raw_assets/<atlasName>/`. Каждая папка первого уровня становится отдельным атласом (`public/assets/<atlasName>.{png,json}`) и типами в `Textures` / `Atlases`.
