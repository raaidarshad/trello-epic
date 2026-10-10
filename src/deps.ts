// Dependencies, stored as per-card pluginData (shared visibility):
//   dependent card: `dependsOn` – ids of the cards blocking it (source of truth)
//   blocker card:   `blocks`    – reverse index of the cards it blocks

import { type Board, type CardInfo, boardIndex, cardStatus, getIds, walkIds, writeIds } from './board';

export function getDependsOn(t: T, id: string): Promise<string[]> {
  return getIds(t, id, 'dependsOn');
}

export function getBlocks(t: T, id: string): Promise<string[]> {
  return getIds(t, id, 'blocks');
}

/** Every card `id` transitively depends on. */
export function upstreamIds(t: T, id: string): Promise<Set<string>> {
  return walkIds(t, id, 'dependsOn');
}

/** Every card that transitively depends on `id`. */
export function downstreamIds(t: T, id: string): Promise<Set<string>> {
  return walkIds(t, id, 'blocks');
}

/** Make `cardId` depend on `blockerId`. */
export async function addDependency(t: T, cardId: string, blockerId: string): Promise<void> {
  if (cardId === blockerId) throw new Error('A card cannot depend on itself');
  if ((await upstreamIds(t, blockerId)).has(cardId)) throw new Error('That would create a cycle');

  const deps = await getDependsOn(t, cardId);
  if (!deps.includes(blockerId)) await writeIds(t, cardId, 'dependsOn', [...deps, blockerId]);
  const blocks = await getBlocks(t, blockerId);
  if (!blocks.includes(cardId)) await writeIds(t, blockerId, 'blocks', [...blocks, cardId]);
}

export async function removeDependency(t: T, cardId: string, blockerId: string): Promise<void> {
  const deps = await getDependsOn(t, cardId);
  await writeIds(t, cardId, 'dependsOn', deps.filter((d) => d !== blockerId));
  const blocks = await getBlocks(t, blockerId);
  await writeIds(t, blockerId, 'blocks', blocks.filter((b) => b !== cardId));
}

/** The cards `id` depends on; `unresolved` are the ones not yet done. */
export async function blockerStatus(t: T, id: string, board?: Board) {
  const { cards, lists } = board ?? (await boardIndex(t));
  const all = (await getDependsOn(t, id)).map((d) => cardStatus(d, cards, lists));
  return { all, unresolved: all.filter((c) => c.status === 'open') };
}

/** Open, not-done cards still waiting on `id`. */
export async function blockingStatus(t: T, id: string, board?: Board): Promise<CardInfo[]> {
  const { cards, lists } = board ?? (await boardIndex(t));
  const dependents = (await getBlocks(t, id)).map((d) => cardStatus(d, cards, lists));
  const open = dependents.filter((c) => c.status === 'open');
  // Drop index entries whose dependent no longer lists `id`.
  const live = await Promise.all(open.map(async (c) => (await getDependsOn(t, c.id)).includes(id)));
  return open.filter((_, i) => live[i]);
}
