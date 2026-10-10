const label = import.meta.env.DEV ? '👋 Hello world! (dev)' : '👋 Hello world!';

TrelloPowerUp.initialize({
  'card-badges': () => [{ text: label }],

  'board-buttons': () => [
    {
      text: import.meta.env.DEV ? 'Hello (dev)' : 'Hello',
      callback: (t: any) =>
        t.popup({
          title: 'Hello',
          // Resolve relative to this page so it works under the GitHub Pages subpath too
          url: new URL('popup.html', window.location.href).href,
          height: 120,
        }),
    },
  ],
});
