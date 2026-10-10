import { boardIndex, cardStatus } from './board';
import { blockerStatus, blockingStatus, getBlocks, getDependsOn } from './deps';
import { epicProgress, getChildIds, getParent } from './epics';
import { openDependencyPicker, openParentPicker } from './picker';

// Resolve relative to this page so URLs work under the GitHub Pages subpath too
const asset = (path: string) => new URL(path, window.location.href).href;
const EPIC_ICON = asset('epic.svg');
const DEPS_ICON = asset('deps.svg');
const tag = import.meta.env.DEV ? ' (dev)' : '';

async function relationships(t: T, id: string) {
  const [parent, kids, deps, blocks] = await Promise.all([
    getParent(t, id),
    getChildIds(t, id),
    getDependsOn(t, id),
    getBlocks(t, id),
  ]);
  return { parent, kids, deps, blocks };
}

async function parentName(t: T, parentId: string): Promise<string | undefined> {
  const { cards } = await boardIndex(t);
  return cards.get(parentId)?.name;
}

async function progressBadge(t: T, cardId: string) {
  const { done, total } = await epicProgress(t, cardId);
  return { text: `▣ ${done}/${total}${tag}`, color: done === total ? 'green' : null, refresh: 10 };
}

/** Red badge while this (not-done) card waits on unfinished blockers. */
async function blockedBadge(t: T, cardId: string) {
  const board = await boardIndex(t);
  const { unresolved } = await blockerStatus(t, cardId, board);
  const show = unresolved.length && cardStatus(cardId, board.cards, board.lists).status === 'open';
  const what = unresolved.length === 1 ? unresolved[0].name : unresolved.length;
  return { text: show ? `⛔ Blocked by ${what}${tag}` : '', color: 'red', refresh: 10 };
}

/** Orange badge while this (not-done) card holds up other unfinished cards. */
async function blocksBadge(t: T, cardId: string) {
  const board = await boardIndex(t);
  const waiting = await blockingStatus(t, cardId, board);
  const show = waiting.length && cardStatus(cardId, board.cards, board.lists).status === 'open';
  return { text: show ? `⇢ Blocks ${waiting.length}${tag}` : '', color: 'orange', refresh: 10 };
}

TrelloPowerUp.initialize({
  'card-badges': async (t: T) => {
    const id = t.getContext().card;
    const { parent, kids, deps, blocks } = await relationships(t, id);
    const badges = [];
    if (deps.length) badges.push({ dynamic: () => blockedBadge(t, id) });
    if (blocks.length) badges.push({ dynamic: () => blocksBadge(t, id) });
    if (parent) {
      badges.push({
        dynamic: async () => {
          const name = await parentName(t, parent);
          return { text: name ? `⤴ ${name}${tag}` : '', color: 'purple', refresh: 60 };
        },
      });
    }
    if (kids.length) badges.push({ dynamic: () => progressBadge(t, id) });
    return badges;
  },

  'card-detail-badges': async (t: T) => {
    const id = t.getContext().card;
    const { parent, kids, deps } = await relationships(t, id);
    const badges = [];
    if (deps.length) {
      const { unresolved } = await blockerStatus(t, id);
      if (unresolved.length) {
        badges.push({
          title: 'Blocked by',
          text: unresolved.length === 1 ? unresolved[0].name : `${unresolved.length} cards`,
          color: 'red',
          callback: (t: T) => openDependencyPicker(t, id),
        });
      }
    }
    if (parent) {
      const name = await parentName(t, parent);
      if (name) {
        badges.push({
          title: 'Epic',
          text: name,
          color: 'purple',
          callback: (t: T) => t.showCard(parent),
        });
      }
    }
    if (kids.length) {
      const { done, total } = await epicProgress(t, id);
      badges.push({ title: 'Progress', text: `${done}/${total} done`, color: done === total ? 'green' : null });
    }
    return badges;
  },

  'card-buttons': () => [
    {
      icon: EPIC_ICON,
      text: `Epic${tag}`,
      callback: (t: T) => openParentPicker(t, t.getContext().card),
    },
    {
      icon: DEPS_ICON,
      text: `Depends on${tag}`,
      callback: (t: T) => openDependencyPicker(t, t.getContext().card),
    },
  ],

  'card-back-section': async (t: T) => {
    const { parent, kids, deps, blocks } = await relationships(t, t.getContext().card);
    if (!parent && !kids.length && !deps.length && !blocks.length) return;
    return {
      title: `Relationships${tag}`,
      icon: EPIC_ICON,
      content: { type: 'iframe', url: t.signUrl(asset('section.html')), height: 80 },
    };
  },
});
