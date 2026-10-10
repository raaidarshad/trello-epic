import { type CardInfo, boardIndex } from './board';
import { blockerStatus, blockingStatus, removeDependency } from './deps';
import { ancestors, epicProgress } from './epics';
import { openAddChildPicker, openDependencyPicker } from './picker';

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

/** `✓ Name  List` row; archived cards have no name, so callers decide how to show them. */
function cardRow(card: CardInfo) {
  const li = el('li', card.status === 'open' ? '○ ' : '✓ ', card.status);
  li.append(card.name ? cardLink(card.id, card.name) : el('span', '(archived)'));
  li.append(el('span', card.listName ?? '', 'meta'));
  return li;
}

t.render(async () => {
  const id = t.getContext().card;
  const board = await boardIndex(t);
  const [chain, progress, blockers, blocking] = await Promise.all([
    ancestors(t, id),
    epicProgress(t, id, board),
    blockerStatus(t, id, board),
    blockingStatus(t, id, board),
  ]);
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
    root.append(el('h4', `Epic · ${progress.done}/${progress.total} done`));
    const list = el('ul', undefined, 'children');
    const archived = progress.children.filter((c) => c.status === 'archived').length;
    for (const child of progress.children) if (child.status !== 'archived') list.append(cardRow(child));
    if (archived) list.append(el('li', `+${archived} archived`, 'meta'));
    root.append(list);
  }

  if (blockers.all.length) {
    root.append(el('h4', `Blocked by · ${blockers.unresolved.length} remaining`));
    const list = el('ul', undefined, 'children');
    for (const blocker of blockers.all) {
      const li = cardRow(blocker);
      const remove = el('a', '✕', 'remove');
      remove.title = 'Remove dependency';
      remove.addEventListener('click', () => removeDependency(t, id, blocker.id));
      li.append(remove);
      list.append(li);
    }
    root.append(list);
  }

  if (blocking.length) {
    root.append(el('h4', 'Blocks'));
    const list = el('ul', undefined, 'children');
    for (const dependent of blocking) list.append(cardRow(dependent));
    root.append(list);
  }

  const actions = el('div', undefined, 'actions');
  const add = el('button', '+ Add card');
  add.addEventListener('click', (e) => openAddChildPicker(t, id, e));
  const dep = el('button', '+ Depends on…');
  dep.addEventListener('click', (e) => openDependencyPicker(t, id, e));
  actions.append(add, dep);
  root.append(actions);

  await t.sizeTo('#root');
});
