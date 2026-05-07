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

const goblin: Enemy = {
  name: "Goblin",
  hp: 12,
  attack: 3
};

function randomDamage(max: number): number {
  return Math.floor(Math.random() * max) + 1;
}

const sampleHit = randomDamage(player.attack);
goblin.hp = goblin.hp - sampleHit;
const goblinHit = randomDamage(goblin.attack);
player.hp = player.hp - goblinHit;

console.log("Player:", player);
console.log("Enemy:", goblin);
console.log(`You hit the goblin for ${sampleHit} damage.`);
console.log(`Goblin HP: ${goblin.hp}`);
console.log(`Goblin hits you for ${goblinHit} damage.`);
console.log(`Player HP: ${player.hp}`);
