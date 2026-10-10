import { describe, expect, it } from 'vitest';
import { addDependency, blockerStatus, blockingStatus, removeDependency } from './deps';
import { fakeT } from './test-utils';

const lists = [
  { id: 'wip', name: 'In Progress' },
  { id: 'done', name: 'Done' },
];

describe('add/removeDependency', () => {
  it('keeps dependsOn and the blocks index in sync', async () => {
    const t = fakeT();
    await addDependency(t, 'master', 'mix');
    await addDependency(t, 'master', 'comp');
    await addDependency(t, 'master', 'mix'); // idempotent
    expect(t.data.get('master:dependsOn')).toEqual(['mix', 'comp']);
    expect(t.data.get('mix:blocks')).toEqual(['master']);

    await removeDependency(t, 'master', 'mix');
    expect(t.data.get('master:dependsOn')).toEqual(['comp']);
    expect(t.data.has('mix:blocks')).toBe(false);
  });

  it('rejects self-dependencies and cycles at any depth', async () => {
    const t = fakeT();
    await addDependency(t, 'a', 'b');
    await addDependency(t, 'b', 'c');
    await expect(addDependency(t, 'c', 'a')).rejects.toThrow(/cycle/);
    await expect(addDependency(t, 'a', 'a')).rejects.toThrow();
  });
});

describe('blockerStatus', () => {
  it('counts blockers in Done or archived as resolved', async () => {
    const t = fakeT(
      [
        { id: 'a', name: 'A', idList: 'wip' },
        { id: 'b', name: 'B', idList: 'done' },
        { id: 'blocked', name: 'Blocked', idList: 'wip' },
      ],
      lists,
    );
    for (const blocker of ['a', 'b', 'archived']) await addDependency(t, 'blocked', blocker);
    const { all, unresolved } = await blockerStatus(t, 'blocked');
    expect(all.map((c) => c.status)).toEqual(['open', 'done', 'archived']);
    expect(unresolved.map((c) => c.id)).toEqual(['a']);
  });
});

describe('blockingStatus', () => {
  it('skips done dependents and stale index entries', async () => {
    const t = fakeT(
      [
        { id: 'blocker', name: 'Blocker', idList: 'wip' },
        { id: 'waiting', name: 'Waiting', idList: 'wip' },
        { id: 'finished', name: 'Finished', idList: 'done' },
        { id: 'stale', name: 'Stale', idList: 'wip' },
      ],
      lists,
    );
    for (const dependent of ['waiting', 'finished', 'stale']) await addDependency(t, dependent, 'blocker');
    t.data.delete('stale:dependsOn'); // index on 'blocker' now out of date
    expect((await blockingStatus(t, 'blocker')).map((c) => c.id)).toEqual(['waiting']);
  });
});
