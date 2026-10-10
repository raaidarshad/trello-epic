import { describe, expect, it } from 'vitest';
import { isDoneList, isEpicsList } from './board';
import { ancestors, classifyChildren, descendantIds, epicProgress, setParent } from './epics';
import { fakeT } from './test-utils';

describe('isDoneList', () => {
  it('matches "Done" case-insensitively', () => {
    expect(isDoneList('Done')).toBe(true);
    expect(isDoneList(' done ')).toBe(true);
    expect(isDoneList('Done-ish')).toBe(false);
  });
});

describe('isEpicsList', () => {
  it('matches "Epics" case-insensitively', () => {
    expect(isEpicsList('Epics')).toBe(true);
    expect(isEpicsList(' epics ')).toBe(true);
    expect(isEpicsList('Epic ideas')).toBe(false);
  });
});

describe('classifyChildren', () => {
  const lists = new Map([
    ['l1', { id: 'l1', name: 'In Progress' }],
    ['l2', { id: 'l2', name: 'Done' }],
  ]);
  const cards = new Map([
    ['a', { id: 'a', name: 'Record', idList: 'l1' }],
    ['b', { id: 'b', name: 'Mix', idList: 'l2' }],
  ]);

  it('treats Done-list and missing (archived) cards as done', () => {
    const p = classifyChildren(['a', 'b', 'gone'], cards, lists);
    expect(p).toMatchObject({ done: 2, total: 3 });
    expect(p.children.map((c) => c.status)).toEqual(['open', 'done', 'archived']);
  });
});

describe('setParent', () => {
  it('maintains both sides of the relationship when re-parenting', async () => {
    const t = fakeT();
    await setParent(t, 'task', 'song1');
    await setParent(t, 'task', 'song2');
    expect(t.data.get('task:parent')).toBe('song2');
    expect(t.data.has('song1:children')).toBe(false);
    expect(t.data.get('song2:children')).toEqual(['task']);

    await setParent(t, 'task', null);
    expect(t.data.has('task:parent')).toBe(false);
    expect(t.data.has('song2:children')).toBe(false);
  });

  it('rejects cycles at any depth', async () => {
    const t = fakeT();
    await setParent(t, 'task', 'song');
    await setParent(t, 'song', 'ep');
    expect(await descendantIds(t, 'ep')).toEqual(new Set(['song', 'task']));
    expect(await ancestors(t, 'task')).toEqual(['ep', 'song']);
    await expect(setParent(t, 'ep', 'task')).rejects.toThrow(/cycle/);
    await expect(setParent(t, 'ep', 'ep')).rejects.toThrow();
  });
});

describe('epicProgress', () => {
  it('ignores stale index entries for cards re-parented elsewhere', async () => {
    const t = fakeT(
      [
        { id: 'a', name: 'A', idList: 'l' },
        { id: 'b', name: 'B', idList: 'l' },
      ],
      [{ id: 'l', name: 'Backlog' }],
    );
    await setParent(t, 'a', 'epic');
    await setParent(t, 'b', 'epic');
    t.data.set('b:parent', 'other'); // index on 'epic' now out of date
    expect(await epicProgress(t, 'epic')).toMatchObject({ done: 0, total: 1 });
  });
});
