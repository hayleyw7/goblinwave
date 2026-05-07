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

console.log("Player:", player);
console.log("Enemy:", goblin);
