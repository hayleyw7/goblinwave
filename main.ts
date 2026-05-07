import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

type Player = {
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  gold: number;
};

type Enemy = {
  name: string;
  hp: number;
  attack: number;
};

const player: Player = {
  name: "Hero",
  hp: 20,
  maxHp: 20,
  attack: 5,
  gold: 0
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

async function runGame(): Promise<void> {
  const rl = createInterface({ input, output });
  let turn = 1;
  let wave = 1;

  console.log(`
 ██████╗  ██████╗ ██████╗ ██╗     ██╗███╗   ██╗██╗    ██╗ █████╗ ██╗   ██╗███████╗
██╔════╝ ██╔═══██╗██╔══██╗██║     ██║████╗  ██║██║    ██║██╔══██╗██║   ██║██╔════╝
██║  ███╗██║   ██║██████╔╝██║     ██║██╔██╗ ██║██║ █╗ ██║███████║██║   ██║█████╗
██║   ██║██║   ██║██╔══██╗██║     ██║██║╚██╗██║██║███╗██║██╔══██║╚██╗ ██╔╝██╔══╝
╚██████╔╝╚██████╔╝██████╔╝███████╗██║██║ ╚████║╚███╔███╔╝██║  ██║ ╚████╔╝ ███████╗
 ╚═════╝  ╚═════╝ ╚═════╝ ╚══════╝╚═╝╚═╝  ╚═══╝ ╚══╝╚══╝ ╚═╝  ╚═╝  ╚═══╝  ╚══════╝
`);

  console.log("Survive as many goblin waves as you can.");
  console.log("Type Q or EXIT at any time to quit.");
  console.log("\nPlayer:", player);

  while (player.hp > 0) {
    const goblin = makeGoblin();
    let escaped = false;

    console.log(`
╔════════════════════╗
║       WAVE ${wave}       ║
╚════════════════════╝
`);

    console.log(`A ${goblin.name} appears!`);

    while (player.hp > 0 && goblin.hp > 0) {
      console.log("\n--------------------------------");
      console.log(`TURN ${turn}`);
      console.log("--------------------------------");
      console.log(`Player HP : ${player.hp}/${player.maxHp}`);
      console.log(`Goblin HP : ${goblin.hp}`);

      console.log("\nWhat do you want to do?");
      console.log("1. Attack");
      console.log("2. Heal");
      console.log("3. Dance");
      console.log("4. Run\n");

      const action = (await rl.question("> ")).trim();
      const normalizedAction = action.toLowerCase();

      if (normalizedAction === "q" || normalizedAction === "exit") {
        console.log("Goodbye!");
        rl.close();
        return;
      }

      if (action === "2") {
        const heal = 3;
        player.hp = Math.min(player.maxHp, player.hp + heal);

        console.log("\n💚 HEAL");
        console.log(`You heal for ${heal} HP.`);
        console.log(`Player HP: ${player.hp}/${player.maxHp}`);
      } else if (action === "3") {
        const danceRoll = randomDamage(4);

        console.log("\n🕺 DANCE");

        if (danceRoll === 1) {
          console.log("You dance. The goblin laughs so hard it snorts.");
        } else if (danceRoll === 2) {
          console.log("You dance. The goblin starts dancing with you.");
        } else if (danceRoll === 3) {
          const coins = randomDamage(5);

          player.gold += coins;

          console.log(`You dance. The goblin tips you ${coins} gold.`);
          console.log(`Gold: ${player.gold} (no gameplay effect yet)`);
        } else {
          console.log("You dance. The goblin crosses its arms and glares at you.");
        }

        console.log("\n👹 GOBLIN TURN");
        console.log("The goblin is too distracted to attack.");

        turn += 1;
        continue;
      } else if (action === "4") {
        escaped = true;

        console.log("\n🏃 RUN");
        console.log("You run away to the next wave!");
        break;
      } else if (action === "1") {
        const playerHit = randomDamage(player.attack);

        goblin.hp = Math.max(0, goblin.hp - playerHit);

        console.log("\n⚔️  ATTACK");
        console.log(`You hit the goblin for ${playerHit} damage.`);
        console.log(`Goblin HP: ${goblin.hp}`);
      } else {
        console.log("Choose 1, 2, 3, 4, Q, or EXIT.");
        continue;
      }

      if (goblin.hp <= 0) {
        break;
      }

      const goblinHit = randomDamage(goblin.attack);

      player.hp = Math.max(0, player.hp - goblinHit);

      console.log("\n👹 GOBLIN TURN");
      console.log(`Goblin hits you for ${goblinHit} damage.`);
      console.log(`Player HP: ${player.hp}`);

      turn += 1;
    }

    if (player.hp <= 0) {
      break;
    }

    if (escaped) {
      wave += 1;
      continue;
    }

    console.log("\nYou win this wave!");

    wave += 1;
  }

  console.log("\nYou lose! Game over.");

  rl.close();
}

runGame().catch((error: unknown) => {
  console.error("Game error:", error);
});
