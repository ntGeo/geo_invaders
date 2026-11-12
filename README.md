# Invasores — Arcade Espacial

Juego arcade clásico estilo Space Invaders pensado para navegador en PC y dispositivos móviles con controles táctiles intuitivos, tabla local de los mejores 10 puntajes y audio sintetizado con Web Audio API.

## Desarrollo local

```bash
npm install
npm run dev
```

Para generar la compilación de producción:

```bash
npm run build
```

## Publicar en GitHub Pages

El repositorio incluye el flujo automático de GitHub Actions en `.github/workflows/deploy.yml`:

1. Sube el proyecto a un repositorio en GitHub en la rama `main` (o ajusta la rama en `.github/workflows/deploy.yml`).
2. En tu repositorio de GitHub, ve a **Settings → Pages**.
3. En **Build and deployment → Source**, selecciona **GitHub Actions**.
4. En cada `push` a `main` (o al ejecutar el flujo manualmente desde la pestaña **Actions**), el sitio se compilará con la ruta base correcta y se publicará automáticamente en GitHub Pages.
