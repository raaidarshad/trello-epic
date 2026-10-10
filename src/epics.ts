// Epic relationships, stored as per-card pluginData (shared visibility):
//   child card: `parent`   – the parent card's id (source of truth)
//   epic card:  `children` – index of child card ids, so we can still count
//                            children after they're archived (the client only
//                            sees open cards)

import { type Board, type CardInfo, boardIndex, cardStatus, getIds, walkIds, writeIds } from './board';

export interface Progress {
  done: number;
  total: number;
  children: CardInfo[];
}

export async function getParent(t: T, id: string): Promise<string | null> {
  return (await t.get(id, 'shared', 'parent')) ?? null;
}

export function getChildIds(t: T, id: string): Promise<string[]> {
  return getIds(t, id, 'children');
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
    await writeIds(t, old, 'children', kids.filter((k) => k !== childId));
  }
  if (parentId) {
    const kids = await getChildIds(t, parentId);
    if (!kids.includes(childId)) await writeIds(t, parentId, 'children', [...kids, childId]);
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
export function descendantIds(t: T, id: string): Promise<Set<string>> {
  return walkIds(t, id, 'children');
}

/** Pure classification of an epic's children against the board's open cards. */
export function classifyChildren(childIds: string[], openCards: Board['cards'], lists: Board['lists']): Progress {
  const children = childIds.map((id) => cardStatus(id, openCards, lists));
  const done = children.filter((c) => c.status !== 'open').length;
  return { done, total: children.length, children };
}

export async function epicProgress(t: T, epicId: string, board?: Board): Promise<Progress> {
  const { cards, lists } = board ?? (await boardIndex(t));
  const ids = await getChildIds(t, epicId);
  // Drop index entries for open cards that have since been re-parented elsewhere.
  const parents = await Promise.all(ids.map((id) => (cards.has(id) ? getParent(t, id) : epicId)));
  return classifyChildren(ids.filter((_, i) => parents[i] === epicId), cards, lists);
}
