/** In-memory stand-in for the pluginData + board-read parts of Trello's `t`. */
export function fakeT(cards: TrelloCard[] = [], lists: TrelloList[] = []) {
  const data = new Map<string, unknown>();
  const k = (id: string, key: string) => `${id}:${key}`;
  return {
    data,
    get: async (id: string, _vis: string, key: string) => data.get(k(id, key)),
    set: async (id: string, _vis: string, key: string, value: unknown) => void data.set(k(id, key), value),
    remove: async (id: string, _vis: string, key: string) => void data.delete(k(id, key)),
    cards: async () => cards,
    lists: async () => lists,
  };
}
