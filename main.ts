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

type DanceResponse = {
  message: string;
  gold: number;
};

const player: Player = {
  name: "Hero",
  hp: 20,
  maxHp: 20,
  attack: 5,
  gold: 0
};

const danceResponses: DanceResponse[] = [
  { message: "The goblin claps politely.", gold: 0 },
  { message: "The goblin starts dancing with you.", gold: 0 },
  { message: "The goblin looks confused but supportive.", gold: 0 },
  { message: "The goblin throws a gold coin at your feet.", gold: 1 },
  { message: "The goblin boos loudly.", gold: 0 },
  { message: "The goblin nods to the beat.", gold: 0 },
  { message: "The goblin crosses their arms and watches silently.", gold: 0 },
  { message: "The goblin looks genuinely impressed.", gold: 0 },
  { message: "The goblin laughs so hard they snort.", gold: 0 },
  { message: "The goblin attempts a cartwheel and fails.", gold: 0 },
  { message: "The goblin chants your name.", gold: 0 },
  { message: "The goblin looks emotionally moved.", gold: 0 },
  { message: "The goblin refuses to acknowledge your performance.", gold: 0 },
  { message: "The goblin starts stomping rhythmically.", gold: 0 },
  { message: "The goblin gives you a thumbs up.", gold: 0 },
  { message: "The goblin looks terrified by your moves.", gold: 0 },
  { message: "The goblin throws glitter into the air.", gold: 0 },
  { message: "The goblin starts shadow dancing.", gold: 0 },
  { message: "The goblin spins in a circle.", gold: 0 },
  { message: "The goblin looks disappointed in you personally.", gold: 0 },
  { message: "The goblin starts beatboxing poorly.", gold: 0 },
  { message: "The goblin throws a tomato at you.", gold: 0 },
  { message: "The goblin pretends to be a dance judge.", gold: 0 },
  { message: "The goblin wipes away a tear.", gold: 0 },
  { message: "The goblin starts headbanging.", gold: 0 },
  { message: "The goblin throws you a gold coin.", gold: 1 },
  { message: "The goblin tries to copy your moves.", gold: 0 },
  { message: "The goblin looks spiritually awakened.", gold: 0 },
  { message: "The goblin screams for an encore.", gold: 0 },
  { message: "The goblin rates your performance a 7/10.", gold: 0 }
];

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

function randomDanceResponse(): DanceResponse {
  return danceResponses[Math.floor(Math.random() * danceResponses.length)];
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
      console.log(`Gold      : ${player.gold}`);

      console.log("\nWhat do you want to do?");
      console.log("1. Attack");
      console.log("2. Heal");
      console.log("3. Dance");
      console.log("4. Run\n");

      const action = (await rl.question("> ")).trim();

      console.log("\n════════════════════");
      
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
        const danceResponse = randomDanceResponse();

        console.log("\n🕺 DANCE");
        console.log("You start dancing.");

        console.log("\n👹 GOBLIN TURN");
        console.log(danceResponse.message);

        if (danceResponse.gold > 0) {
          player.gold += danceResponse.gold;

          console.log(`Gold +${danceResponse.gold}`);
        }

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
