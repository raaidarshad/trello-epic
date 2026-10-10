// Trello's client library is loaded from their CDN as a global and ships no types.
// Tighten these as the Power-Up grows.
declare const TrelloPowerUp: any;

/** The `t` handle Trello passes to capability callbacks and iframes. */
type T = any;

interface TrelloCard {
  id: string;
  name: string;
  idList: string;
}

interface TrelloList {
  id: string;
  name: string;
}
