import { ancestors, boardIndex, epicProgress } from './epics';
import { openAddChildPicker } from './picker';

const t = TrelloPowerUp.iframe();

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function cardLink(id: string, name: string) {
  const a = el('a', name);
  a.addEventListener('click', () => t.showCard(id));
  return a;
}

t.render(async () => {
  const id = t.getContext().card;
  const board = await boardIndex(t);
  const [chain, progress] = await Promise.all([ancestors(t, id), epicProgress(t, id, board)]);
  const root = document.getElementById('root')!;
  root.replaceChildren();

  if (chain.length) {
    const crumbs = el('p', undefined, 'crumbs');
    for (const ancestorId of chain) {
      const name = board.cards.get(ancestorId)?.name;
      crumbs.append(name ? cardLink(ancestorId, name) : el('span', '(archived)'), ' › ');
    }
    crumbs.append(el('span', board.cards.get(id)?.name ?? 'this card'));
    root.append(crumbs);
  }

  if (progress.total) {
    root.append(el('p', `${progress.done}/${progress.total} done`, 'crumbs'));
    const list = el('ul', undefined, 'children');
    let archived = 0;
    for (const child of progress.children) {
      if (child.status === 'archived') {
        archived++;
        continue;
      }
      const li = el('li', child.status === 'done' ? '✓ ' : '○ ', child.status);
      li.append(cardLink(child.id, child.name!), el('span', child.listName ?? '', 'meta'));
      list.append(li);
    }
    if (archived) list.append(el('li', `+${archived} archived`, 'meta'));
    root.append(list);
  }

  const add = el('button', '+ Add card');
  add.addEventListener('click', (e) => openAddChildPicker(t, id, e));
  root.append(add);

  await t.sizeTo('#root');
});
