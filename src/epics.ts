// Epic relationships, stored as per-card pluginData (shared visibility):
//   child card: `parent`   – the parent card's id (source of truth)
//   epic card:  `children` – index of child card ids, so we can still count
//                            children after they're archived (the client only
//                            sees open cards)

export type ChildStatus = 'open' | 'done' | 'archived';

export interface ChildInfo {
  id: string;
  name?: string;
  listName?: string;
  status: ChildStatus;
}

export interface Progress {
  done: number;
  total: number;
  children: ChildInfo[];
}

export async function getParent(t: T, id: string): Promise<string | null> {
  return (await t.get(id, 'shared', 'parent')) ?? null;
}

export async function getChildIds(t: T, id: string): Promise<string[]> {
  return (await t.get(id, 'shared', 'children')) ?? [];
}

async function writeChildIds(t: T, id: string, ids: string[]): Promise<void> {
  if (ids.length) await t.set(id, 'shared', 'children', ids);
  else await t.remove(id, 'shared', 'children');
}

/** Move `childId` under `parentId`, or detach it when `parentId` is null. */
export async function setParent(t: T, childId: string, parentId: string | null): Promise<void> {
  if (parentId === childId) throw new Error('A card cannot be its own epic');
  if (parentId && (await descendantIds(t, childId)).has(parentId)) {
    throw new Error('That would create a cycle');
  }

  const old = await getParent(t, childId);
  if (old === parentId) return;

  if (parentId) await t.set(childId, 'shared', 'parent', parentId);
  else await t.remove(childId, 'shared', 'parent');

  if (old) {
    const kids = await getChildIds(t, old);
    await writeChildIds(t, old, kids.filter((k) => k !== childId));
  }
  if (parentId) {
    const kids = await getChildIds(t, parentId);
    if (!kids.includes(childId)) await writeChildIds(t, parentId, [...kids, childId]);
  }
}

/** Parent chain from the top-most epic down to (excluding) `id`. */
export async function ancestors(t: T, id: string): Promise<string[]> {
  const chain: string[] = [];
  const seen = new Set([id]);
  for (let cur = await getParent(t, id); cur && !seen.has(cur); cur = await getParent(t, cur)) {
    seen.add(cur);
    chain.unshift(cur);
  }
  return chain;
}

/** Every card below `id` at any depth (not including `id`). */
export async function descendantIds(t: T, id: string): Promise<Set<string>> {
  const found = new Set<string>();
  let frontier = [id];
  while (frontier.length) {
    const next: string[] = [];
    for (const kids of await Promise.all(frontier.map((f) => getChildIds(t, f)))) {
      for (const k of kids) {
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

export function isDoneList(name: string): boolean {
  return name.trim().toLowerCase() === 'done';
}

/** Pure classification of an epic's children against the board's open cards. */
export function classifyChildren(
  childIds: string[],
  openCards: Map<string, TrelloCard>,
  lists: Map<string, TrelloList>,
): Progress {
  const children = childIds.map((id): ChildInfo => {
    const card = openCards.get(id);
    if (!card) return { id, status: 'archived' };
    const listName = lists.get(card.idList)?.name;
    const status = listName && isDoneList(listName) ? 'done' : 'open';
    return { id, name: card.name, listName, status };
  });
  const done = children.filter((c) => c.status !== 'open').length;
  return { done, total: children.length, children };
}

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

export async function epicProgress(t: T, epicId: string, board?: Awaited<ReturnType<typeof boardIndex>>): Promise<Progress> {
  const { cards, lists } = board ?? (await boardIndex(t));
  const ids = await getChildIds(t, epicId);
  // Drop index entries for open cards that have since been re-parented elsewhere.
  const parents = await Promise.all(ids.map((id) => (cards.has(id) ? getParent(t, id) : epicId)));
  return classifyChildren(ids.filter((_, i) => parents[i] === epicId), cards, lists);
}
