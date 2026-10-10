# trello-epic

A personal Trello Power-Up. It's a static site built with Vite and TypeScript, and pushes to `main` deploy it to GitHub Pages.

- **Prod connector URL:** https://raaidarshad.github.io/trello-epic/
- **Dev connector URL:** https://localhost:5173/

## Dev loop

```sh
npm install
npm run dev     # https://localhost:5173 (self-signed cert)
```

Edit `src/*`, then reload the Trello board tab. Pushing to `main` redeploys prod in about a minute.

The first time, open https://localhost:5173 in your browser and accept the certificate warning. If you skip this, the dev Power-Up silently fails to load.

## Trello setup (one-time)

1. Go to https://trello.com/power-ups/admin and pick your Workspace. Create two Power-Ups:
   - **Epic (dev)**, with iframe connector URL `https://localhost:5173/`
   - **Epic**, with iframe connector URL `https://raaidarshad.github.io/trello-epic/`
2. In each Power-Up's **Capabilities** tab, enable `board-buttons` and `card-badges`. Enable any new capability here whenever you add one to `TrelloPowerUp.initialize`.
3. On a board in that Workspace, open **Power-Ups → Custom** and add one.

## Layout

- `index.html` + `src/main.ts`: the iframe connector, which registers capabilities
- `popup.html` + `src/popup.ts`: the popup opened by the board button
- `.github/workflows/deploy.yml`: build and deploy to GitHub Pages
