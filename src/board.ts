// Board reads and pluginData helpers shared by epics and dependencies.

export type Status = 'open' | 'done' | 'archived';

export interface CardInfo {
  id: string;
  name?: string;
  listName?: string;
  status: Status;
}

export type Board = Awaited<ReturnType<typeof boardIndex>>;

export async function boardIndex(t: T) {
  const [cards, lists]: [TrelloCard[], TrelloList[]] = await Promise.all([
    t.cards('id', 'name', 'idList'),
    t.lists('id', 'name'),
  ]);
  return {
    cards: new Map(cards.map((c) => [c.id, c])),
    lists: new Map(lists.map((l) => [l.id, l])),
  };
}

export function isDoneList(name: string): boolean {
  return name.trim().toLowerCase() === 'done';
}

/** Only cards in this list are offered when choosing a card's epic. */
export function isEpicsList(name: string): boolean {
  return name.trim().toLowerCase() === 'epics';
}

/** A card missing from the board's open cards is treated as archived (which counts as done). */
export function cardStatus(id: string, cards: Board['cards'], lists: Board['lists']): CardInfo {
  const card = cards.get(id);
  if (!card) return { id, status: 'archived' };
  const listName = lists.get(card.idList)?.name;
  const status = listName && isDoneList(listName) ? 'done' : 'open';
  return { id, name: card.name, listName, status };
}

/** A card-id list stored in a card's shared pluginData. */
export async function getIds(t: T, id: string, key: string): Promise<string[]> {
  return (await t.get(id, 'shared', key)) ?? [];
}

export async function writeIds(t: T, id: string, key: string, ids: string[]): Promise<void> {
  if (ids.length) await t.set(id, 'shared', key, ids);
  else await t.remove(id, 'shared', key);
}

/** Every card reachable from `id` by following `key` lists, at any depth (not including `id`). */
export async function walkIds(t: T, id: string, key: string): Promise<Set<string>> {
  const found = new Set<string>();
  let frontier = [id];
  while (frontier.length) {
    const next: string[] = [];
    for (const ids of await Promise.all(frontier.map((f) => getIds(t, f, key)))) {
      for (const k of ids) {
        if (k !== id && !found.has(k)) {
          found.add(k);
          next.push(k);
        }
      }
    }
    frontier = next;
  }
  return found;
}
