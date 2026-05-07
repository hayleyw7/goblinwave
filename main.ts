type Player = {
  name: string;
  hp: number;
  attack: number;
};

type Enemy = {
  name: string;
  hp: number;
  attack: number;
};

const player: Player = {
  name: "Hero",
  hp: 20,
  attack: 5
};

function makeGoblin(): Enemy {
  return {
    name: "Goblin",
    hp: 12,
    attack: 3
  };
}

function randomDamage(max: number): number {
  return Math.floor(Math.random() * max) + 1;
}

let turn = 1;
let wave = 1;

console.log("Player:", player);

while (player.hp > 0) {
  const goblin = makeGoblin();
  console.log(`\nWave ${wave}: A ${goblin.name} appears!`);

  while (player.hp > 0 && goblin.hp > 0) {
  console.log(`Turn ${turn}`);
  const playerHit = randomDamage(player.attack);
  goblin.hp = Math.max(0, goblin.hp - playerHit);
  console.log(`You hit the goblin for ${playerHit} damage.`);
  console.log(`Goblin HP: ${goblin.hp}`);

  if (goblin.hp <= 0) {
    break;
  }

  const goblinHit = randomDamage(goblin.attack);
  player.hp = Math.max(0, player.hp - goblinHit);
  console.log(`Goblin hits you for ${goblinHit} damage.`);
  console.log(`Player HP: ${player.hp}`);
  console.log("---");
  turn += 1;
  }

  if (player.hp <= 0) {
    break;
  }

  console.log("You win this wave!");
  wave += 1;
}

console.log("You lose! Game over.");
