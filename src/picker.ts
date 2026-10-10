import { ancestors, boardIndex, descendantIds, getChildIds, getParent, setParent } from './epics';

interface PopupItem {
  text: string;
  alwaysVisible?: boolean;
  callback: (t: T) => unknown;
}

function searchablePopup(t: T, title: string, items: PopupItem[], mouseEvent?: MouseEvent) {
  return t.popup({
    title,
    mouseEvent,
    items: (_t: T, options: { search: string }) => {
      const q = options.search.trim().toLowerCase();
      return items.filter((i) => i.alwaysVisible || i.text.toLowerCase().includes(q));
    },
    search: {
      count: 15,
      placeholder: 'Search cards…',
      empty: 'No matching cards',
      searching: 'Searching…',
    },
  });
}

/** Cards on the board, epics (cards with children) first. */
async function candidates(t: T, exclude: Set<string>) {
  const { cards } = await boardIndex(t);
  const open = [...cards.values()].filter((c) => !exclude.has(c.id));
  const isEpic = await Promise.all(open.map(async (c) => (await getChildIds(t, c.id)).length > 0));
  return open
    .map((card, i) => ({ card, epic: isEpic[i] }))
    .sort((a, b) => Number(b.epic) - Number(a.epic));
}

/** Choose (or clear) the epic that `cardId` belongs to. */
export async function openParentPicker(t: T, cardId: string, mouseEvent?: MouseEvent) {
  const [current, below] = await Promise.all([getParent(t, cardId), descendantIds(t, cardId)]);
  const options = await candidates(t, new Set([cardId, ...below]));

  const items: PopupItem[] = options.map(({ card, epic }) => ({
    text: `${epic ? '▣ ' : ''}${card.name}${card.id === current ? ' ✓' : ''}`,
    callback: async (t) => {
      await setParent(t, cardId, card.id);
      t.closePopup();
    },
  }));
  if (current) {
    items.unshift({
      text: '✕ Remove from epic',
      alwaysVisible: true,
      callback: async (t) => {
        await setParent(t, cardId, null);
        t.closePopup();
      },
    });
  }
  return searchablePopup(t, 'Set epic', items, mouseEvent);
}

/** Add an existing card as a child of `epicId`. */
export async function openAddChildPicker(t: T, epicId: string, mouseEvent?: MouseEvent) {
  const [above, kids] = await Promise.all([ancestors(t, epicId), getChildIds(t, epicId)]);
  const options = await candidates(t, new Set([epicId, ...above, ...kids]));

  const items: PopupItem[] = options.map(({ card, epic }) => ({
    text: `${epic ? '▣ ' : ''}${card.name}`,
    callback: async (t) => {
      await setParent(t, card.id, epicId);
      t.closePopup();
    },
  }));
  return searchablePopup(t, 'Add card to epic', items, mouseEvent);
}
