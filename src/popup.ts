const t = TrelloPowerUp.iframe();

t.render(async () => {
  const board = await t.board('name');
  document.getElementById('board')!.textContent = `You're on board: ${board.name}`;
  await t.sizeTo('#content');
});
