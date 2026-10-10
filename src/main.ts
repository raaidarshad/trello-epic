import { boardIndex, epicProgress, getChildIds, getParent } from './epics';
import { openParentPicker } from './picker';

// Resolve relative to this page so URLs work under the GitHub Pages subpath too
const asset = (path: string) => new URL(path, window.location.href).href;
const ICON = asset('epic.svg');
const tag = import.meta.env.DEV ? ' (dev)' : '';

async function parentName(t: T, parentId: string): Promise<string | undefined> {
  const { cards } = await boardIndex(t);
  return cards.get(parentId)?.name;
}

async function progressBadge(t: T, cardId: string) {
  const { done, total } = await epicProgress(t, cardId);
  return { text: `▣ ${done}/${total}${tag}`, color: done === total ? 'green' : null, refresh: 10 };
}

TrelloPowerUp.initialize({
  'card-badges': async (t: T) => {
    const id = t.getContext().card;
    const [parent, kids] = await Promise.all([getParent(t, id), getChildIds(t, id)]);
    const badges = [];
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
    const [parent, kids] = await Promise.all([getParent(t, id), getChildIds(t, id)]);
    const badges = [];
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
      icon: ICON,
      text: `Epic${tag}`,
      callback: (t: T) => openParentPicker(t, t.getContext().card),
    },
  ],

  'card-back-section': async (t: T) => {
    const id = t.getContext().card;
    const [parent, kids] = await Promise.all([getParent(t, id), getChildIds(t, id)]);
    if (!parent && !kids.length) return;
    return {
      title: `Epic${tag}`,
      icon: ICON,
      content: { type: 'iframe', url: t.signUrl(asset('section.html')), height: 80 },
    };
  },
});
