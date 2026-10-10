# trello-epic

A personal Trello Power-Up that adds **epics**, nested groups of cards that work independently of labels. It's a static site built with Vite and TypeScript, and pushes to `main` deploy it to GitHub Pages.

- **Prod connector URL:** https://raaidarshad.github.io/trello-epic/
- **Dev connector URL:** https://localhost:5173/

## Epics

An epic is just a card. Any card can belong to a parent card, and nesting can go as deep as you like (task → song → EP).

- **Epic** (card button, in the card's Power-Ups section): pick the card's parent epic from the cards in the **Epics** list, or remove it from its epic.
- **Front of card:** `⤴ Parent` shows which epic a card belongs to. On an epic, `▣ done/total` counts its direct children and turns green when they're all done.
- **Back of card:** an Epic section with a breadcrumb, the children and their lists, and **+ Add card** for adding existing cards.
- A child counts as **done** when it's in a list named `Done` or it's archived.
- Data is stored as card pluginData: `parent` on the child (the source of truth) and a `children` index on the epic. Parent and children must be on the same board.

Epic cards must be in a list named `Epics` (any capitalisation) to be offered by the Epic button. **+ Add card** on an epic can still add any card.

## Dev loop

```sh
npm install
npm run dev     # https://localhost:5173 (self-signed cert)
npm test        # unit tests for the epic data layer
```

Edit `src/*`, then reload the Trello board tab. Pushing to `main` redeploys prod in about a minute.

The first time, open https://localhost:5173 in your browser and accept the certificate warning. If you skip this, the dev Power-Up silently fails to load.

## Trello setup (one-time)

1. Go to https://trello.com/power-ups/admin and pick your Workspace. Create two Power-Ups:
   - **Epic (dev)**, with iframe connector URL `https://localhost:5173/`
   - **Epic**, with iframe connector URL `https://raaidarshad.github.io/trello-epic/`
2. In each Power-Up's **Capabilities** tab, enable `card-badges`, `card-detail-badges`, `card-buttons` and `card-back-section`. Enable any new capability here whenever you add one to `TrelloPowerUp.initialize`.
3. On a board in that Workspace, open **Power-Ups → Custom** and add one.

## Layout

- `index.html` + `src/main.ts`: the iframe connector, which registers capabilities
- `src/epics.ts`: the epic data layer (parent/children storage, progress, cycle checks), tested in `src/epics.test.ts`
- `src/picker.ts`: searchable popups for choosing a parent or adding a child
- `section.html` + `src/section.ts`: the Epic section on the back of a card
- `.github/workflows/deploy.yml`: test, build and deploy to GitHub Pages
