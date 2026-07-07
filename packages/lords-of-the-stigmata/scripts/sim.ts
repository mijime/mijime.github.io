import { createEngine, dispatch, startGame } from "../src/engine/engine.ts";
import { legalActions } from "../src/engine/ai.ts";
import { scoreAction } from "../src/engine/ai-scoring.ts";
import type { Action, Engine, FactionKey } from "../src/types.ts";
import { FACTION_KEYS } from "../src/data/factions.ts";

const SEL = ["A", "B", "C", "D", "E", "F", "G"];
const POOL = ["honoo", "rashinban", "shokan", "seiyaku", "monsho", "izumi"];
const FULL_TILES = [
  "tile.dispatchAny",
  "tile.promote",
  "tile.acquire",
  "tile.cohabit",
  "tile.deepen",
  "tile.dispatchAp",
];

interface Bot {
  name: string;
  chooseAction(e: Engine, pi: number): Action;
}

const greedyBot: Bot = {
  name: "greedy",
  chooseAction(e: Engine, pi: number): Action {
    let best: Action = { type: "pass" };
    let bestScore = 0;
    const allActions = legalActions(e, pi);
    for (const a of allActions) {
      const s = scoreAction(e, pi, a);
      if (s > bestScore) {
        best = a;
        bestScore = s;
      }
    }
    return best;
  },
};

const improvedBot: Bot = {
  name: "improved",
  chooseAction(e: Engine, pi: number): Action {
    let best: Action = { type: "pass" };
    let bestScore = 0;
    const allActions = legalActions(e, pi);
    for (const a of allActions) {
      const s = scoreAction(e, pi, a);
      if (s > bestScore) {
        best = a;
        bestScore = s;
      }
    }
    return best;
  },
};

const botRegistry: Record<string, Bot> = {
  greedy: greedyBot,
  improved: improvedBot,
};

interface PlayerGameResult {
  pi: number;
  total: number;
  faction: FactionKey;
  seat: number;
}

interface GameResult {
  factions: FactionKey[];
  seats: number[];
  winners: number[];
  playerResults: PlayerGameResult[];
  doctrines: string[];
  relics: string[];
  playerDoctrines: Record<number, string[]>;
  playerRelics: Record<number, string[]>;
  actionCounts: Record<number, Record<string, number>>;
  vpBreakdown: Record<number, { key: string; n: number }[]>;
}

function runGame(factions: FactionKey[], seats: number[], bots: Bot[], seed: number): GameResult {
  const e = createEngine();
  startGame(e, factions.length - 1, SEL, seed, POOL, FULL_TILES, factions);

  const actionCounts: Record<number, Record<string, number>> = {};
  for (let pi = 0; pi < factions.length; pi++) {
    actionCounts[pi] = { pass: 0, dispatch: 0, promote: 0, acquire: 0, deepen: 0, upgrade: 0 };
  }

  let guard = 0;
  while (!e.over && guard++ < 5000) {
    if (e.pending?.kind === "action") {
      const pi = e.pending.pi;
      const seatIdx = seats.indexOf(pi);
      const bot = bots[seatIdx];
      const action = bot.chooseAction(e, pi);
      const actionType = action.type;
      if (actionType in actionCounts[pi]) {
        actionCounts[pi][actionType]++;
      }
      dispatch(e, { type: "chooseAction", action });
    } else if (e.pending?.kind === "pickCountry") {
      dispatch(e, { type: "pickCountry", key: null });
    } else {
      dispatch(e, { type: "tick" });
    }
  }

  const playerDoctrines: Record<number, string[]> = {};
  const playerRelics: Record<number, string[]> = {};

  const playerResults = e.finalResults!.map((result) => {
    const pi = result.pi;
    const seatIdx = seats.indexOf(pi);
    const doctrines = e.S.players[pi].doctrines.map((d) => d.key);
    const relics = e.S.players[pi].relics;
    playerDoctrines[pi] = doctrines;
    playerRelics[pi] = relics;
    return {
      pi,
      total: result.total,
      faction: factions[seatIdx],
      seat: seatIdx,
    };
  });

  const maxTotal = Math.max(...playerResults.map((r) => r.total));
  const winners = playerResults.filter((r) => r.total === maxTotal).map((r) => r.pi);

  const doctrines: string[] = [];
  const relics: string[] = [];
  for (const [pi] of Object.entries(playerDoctrines)) {
    for (const d of playerDoctrines[parseInt(pi, 10)]) {
      if (!doctrines.includes(d)) doctrines.push(d);
    }
  }
  for (const [pi] of Object.entries(playerRelics)) {
    for (const r of playerRelics[parseInt(pi, 10)]) {
      if (!relics.includes(r)) relics.push(r);
    }
  }

  const vpBreakdown: Record<number, { key: string; n: number }[]> = {};
  for (const result of e.finalResults!) {
    const pi = result.pi;
    vpBreakdown[pi] = result.lines;
  }

  return {
    factions,
    seats,
    winners,
    playerResults,
    doctrines,
    relics,
    playerDoctrines,
    playerRelics,
    actionCounts,
    vpBreakdown,
  };
}

interface FactionStats {
  gamesPlayed: number;
  wins: number;
  avgVP: number;
}

interface SeatStats {
  gamesPlayed: number;
  wins: number;
}

interface DoctrineStats {
  acquisitionRate: number;
  holderWinRate: number;
}

interface RelicStats {
  acquisitionRate: number;
  holderWinRate: number;
}

interface ActionDistStats {
  pass: number;
  dispatch: number;
  promote: number;
  acquire: number;
  deepen: number;
  upgrade: number;
  gameCount: number;
}

interface VPBreakdownStats {
  [key: string]: number;
}

interface FactionDiagnostics {
  actionDist: Record<FactionKey, ActionDistStats>;
  vpBreakdown: Record<FactionKey, VPBreakdownStats>;
}

function parseArgs() {
  const args = process.argv.slice(2);
  let games = 20;
  let players: number[] = [3, 4];
  let arena: [string, string] | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--games" && i + 1 < args.length) {
      games = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--players" && i + 1 < args.length) {
      const p = args[i + 1];
      if (p === "all") {
        players = [3, 4];
      } else {
        const n = parseInt(p, 10);
        if (n === 3 || n === 4) players = [n];
      }
      i++;
    } else if (args[i] === "--arena" && i + 1 < args.length) {
      const parts = args[i + 1].split(",");
      if (parts.length === 2) {
        arena = [parts[0], parts[1]];
      }
      i++;
    }
  }

  return { games, players, arena };
}

function* combinations<T>(arr: T[], n: number): Generator<T[]> {
  if (n === 1) {
    for (const item of arr) {
      yield [item];
    }
  } else {
    for (let i = 0; i <= arr.length - n; i++) {
      for (const combo of combinations(arr.slice(i + 1), n - 1)) {
        yield [arr[i], ...combo];
      }
    }
  }
}

function run() {
  const { games, players: playerCounts, arena } = parseArgs();

  const botA = arena ? botRegistry[arena[0]] : greedyBot;
  const botB = arena ? botRegistry[arena[1]] : greedyBot;

  if (arena && (!botA || !botB)) {
    console.error(`Unknown bot in --arena. Available: ${Object.keys(botRegistry).join(", ")}`);
    process.exit(1);
  }

  for (const nPlayers of playerCounts) {
    const nFactions = Math.min(nPlayers, 6);
    const matchups = Array.from(combinations(FACTION_KEYS, nFactions));

    const factionStats: Record<FactionKey, Record<number, FactionStats>> = {};
    const seatStats: Record<number, Record<number, SeatStats>> = {};
    const doctrineStats: Record<string, DoctrineStats> = {};
    const relicStats: Record<string, RelicStats> = {};

    const diagnostics: Record<FactionKey, FactionDiagnostics> = {};
    for (const faction of FACTION_KEYS) {
      diagnostics[faction] = {
        actionDist: {
          pass: 0,
          dispatch: 0,
          promote: 0,
          acquire: 0,
          deepen: 0,
          upgrade: 0,
          gameCount: 0,
        },
        vpBreakdown: {},
      };
    }

    for (const faction of FACTION_KEYS) {
      factionStats[faction] = {
        [nPlayers]: {
          gamesPlayed: 0,
          wins: 0,
          avgVP: 0,
        },
      };
    }

    for (let seat = 0; seat < nPlayers; seat++) {
      seatStats[seat] = {
        [nPlayers]: { gamesPlayed: 0, wins: 0 },
      };
    }

    let totalGames = 0;

    const botStats: Record<string, { games: number; wins: number }> = {};
    if (arena) {
      if (arena[0] !== arena[1]) {
        botStats[arena[0]] = { games: 0, wins: 0 };
        botStats[arena[1]] = { games: 0, wins: 0 };
      } else {
        botStats[arena[0]] = { games: 0, wins: 0 };
      }
    }

    for (const matchupFactions of matchups) {
      const rotations = nPlayers;
      for (let rotation = 0; rotation < rotations; rotation++) {
        for (let seed = 0; seed < games; seed++) {
          const rotatedFactions = [
            ...matchupFactions.slice(rotation),
            ...matchupFactions.slice(0, rotation),
          ];

          const bots: Bot[] = [];
          const seats: number[] = [];

          if (arena) {
            // Offset bot->seat assignment by rotation so each bot plays every
            // seat equally (removes turn-order confound in head-to-head).
            for (let i = 0; i < nPlayers; i++) {
              seats.push(i);
              bots.push((i + rotation) % 2 === 0 ? botA : botB);
            }
          } else {
            for (let i = 0; i < nPlayers; i++) {
              seats.push(i);
              bots.push(greedyBot);
            }
          }

          const result = runGame(rotatedFactions as FactionKey[], seats, bots, seed);

          totalGames++;

          // Track per-faction stats and diagnostics
          for (const pr of result.playerResults) {
            const faction = pr.faction;
            if (!factionStats[faction][nPlayers]) {
              factionStats[faction][nPlayers] = {
                gamesPlayed: 0,
                wins: 0,
                avgVP: 0,
              };
            }
            const stats = factionStats[faction][nPlayers];
            stats.gamesPlayed++;
            stats.avgVP += pr.total;
            if (result.winners.includes(pr.pi)) {
              stats.wins++;
            }

            // Track action distribution
            const pi = pr.pi;
            const diag = diagnostics[faction];
            diag.actionDist.gameCount++;
            for (const [actionType, count] of Object.entries(result.actionCounts[pi])) {
              if (actionType in diag.actionDist) {
                (diag.actionDist as Record<string, number>)[actionType] += count;
              }
            }

            // Track VP breakdown
            for (const line of result.vpBreakdown[pi]) {
              if (!diag.vpBreakdown[line.key]) {
                diag.vpBreakdown[line.key] = 0;
              }
              diag.vpBreakdown[line.key] += line.n;
            }
          }

          // Track per-seat stats
          for (const pr of result.playerResults) {
            const seat = pr.seat;
            seatStats[seat][nPlayers].gamesPlayed++;
            if (result.winners.includes(pr.pi)) {
              seatStats[seat][nPlayers].wins++;
            }
          }

          // Track per-bot stats
          if (arena) {
            for (const pr of result.playerResults) {
              const botName = (pr.seat + rotation) % 2 === 0 ? arena[0] : arena[1];
              botStats[botName].games++;
              if (result.winners.includes(pr.pi)) {
                botStats[botName].wins++;
              }
            }
          }

          // Track doctrine stats
          for (const doc of result.doctrines) {
            if (!doctrineStats[doc]) {
              doctrineStats[doc] = {
                acquisitionRate: 0,
                holderWinRate: 0,
              };
            }
            const holders = result.playerResults.filter((pr) =>
              result.playerDoctrines[pr.pi].includes(doc),
            );
            if (holders.length > 0) {
              doctrineStats[doc].acquisitionRate++;
              const holderWins = holders.filter((h) => result.winners.includes(h.pi)).length;
              if (holderWins > 0) {
                doctrineStats[doc].holderWinRate += holderWins / holders.length;
              }
            }
          }

          // Track relic stats
          for (const r of result.relics) {
            if (!relicStats[r]) {
              relicStats[r] = {
                acquisitionRate: 0,
                holderWinRate: 0,
              };
            }
            const holders = result.playerResults.filter((pr) =>
              result.playerRelics[pr.pi].includes(r),
            );
            if (holders.length > 0) {
              relicStats[r].acquisitionRate++;
              const holderWins = holders.filter((h) => result.winners.includes(h.pi)).length;
              if (holderWins > 0) {
                relicStats[r].holderWinRate += holderWins / holders.length;
              }
            }
          }
        }
      }
    }

    // Print faction table
    console.log(`\n=== ${nPlayers}-Player Faction Stats ===`);
    console.log(
      `${"Faction".padEnd(15)} ${"Games".padEnd(6)} ${"Wins".padEnd(6)} ${"Win %".padEnd(8)} ${"Expected".padEnd(10)} ${"Avg VP".padEnd(8)}`,
    );
    console.log("-".repeat(60));

    for (const faction of FACTION_KEYS) {
      const stats = factionStats[faction][nPlayers];
      if (stats.gamesPlayed === 0) continue;

      const winRate = ((stats.wins / stats.gamesPlayed) * 100).toFixed(1);
      const expected = ((100 / nPlayers) as unknown as string).toFixed(1);
      const avgVP = (stats.avgVP / stats.gamesPlayed).toFixed(2);

      console.log(
        `${faction.padEnd(15)} ${String(stats.gamesPlayed).padEnd(6)} ${String(stats.wins).padEnd(6)} ${winRate.padEnd(8)} ${expected.padEnd(10)} ${avgVP.padEnd(8)}`,
      );
    }

    // Print seat table
    console.log(`\n=== ${nPlayers}-Player Seat Stats ===`);
    console.log(`${"Seat".padEnd(6)} ${"Games".padEnd(6)} ${"Win %".padEnd(8)}`);
    console.log("-".repeat(30));

    for (let seat = 0; seat < nPlayers; seat++) {
      const stats = seatStats[seat][nPlayers];
      const winRate = ((stats.wins / stats.gamesPlayed) * 100).toFixed(1);
      console.log(
        `${String(seat).padEnd(6)} ${String(stats.gamesPlayed).padEnd(6)} ${winRate.padEnd(8)}`,
      );
    }

    // Print doctrine/relic table
    if (Object.keys(doctrineStats).length > 0 || Object.keys(relicStats).length > 0) {
      console.log(`\n=== Doctrine & Relic Stats ===`);
      console.log(
        `${"Type".padEnd(10)} ${"Key".padEnd(20)} ${"Acq %".padEnd(8)} ${"Winner %".padEnd(10)}`,
      );
      console.log("-".repeat(50));

      for (const [key, stats] of Object.entries(doctrineStats)) {
        const acqRate = ((stats.acquisitionRate / totalGames) * 100).toFixed(1);
        const winRate =
          stats.acquisitionRate > 0
            ? ((stats.holderWinRate / stats.acquisitionRate) * 100).toFixed(1)
            : "0.0";
        console.log(
          `${"Doctrine".padEnd(10)} ${key.padEnd(20)} ${acqRate.padEnd(8)} ${winRate.padEnd(10)}`,
        );
      }

      for (const [key, stats] of Object.entries(relicStats)) {
        const acqRate = ((stats.acquisitionRate / totalGames) * 100).toFixed(1);
        const winRate =
          stats.acquisitionRate > 0
            ? ((stats.holderWinRate / stats.acquisitionRate) * 100).toFixed(1)
            : "0.0";
        console.log(
          `${"Relic".padEnd(10)} ${key.padEnd(20)} ${acqRate.padEnd(8)} ${winRate.padEnd(10)}`,
        );
      }
    }

    // Print action distribution diagnostics
    console.log(`\n=== ${nPlayers}-Player Action Distribution (avg per game) ===`);
    console.log(
      `${"Faction".padEnd(15)} ${"Pass".padEnd(8)} ${"Dispatch".padEnd(10)} ${"Promote".padEnd(8)} ${"Acquire".padEnd(8)} ${"Deepen".padEnd(8)} ${"Upgrade".padEnd(8)}`,
    );
    console.log("-".repeat(75));

    for (const faction of FACTION_KEYS) {
      const diag = diagnostics[faction];
      if (diag.actionDist.gameCount === 0) continue;

      const gameCount = diag.actionDist.gameCount;
      const passCount = (diag.actionDist.pass / gameCount).toFixed(2);
      const dispatchCount = (diag.actionDist.dispatch / gameCount).toFixed(2);
      const promoteCount = (diag.actionDist.promote / gameCount).toFixed(2);
      const acquireCount = (diag.actionDist.acquire / gameCount).toFixed(2);
      const deepenCount = (diag.actionDist.deepen / gameCount).toFixed(2);
      const upgradeCount = (diag.actionDist.upgrade / gameCount).toFixed(2);

      console.log(
        `${faction.padEnd(15)} ${passCount.padEnd(8)} ${dispatchCount.padEnd(10)} ${promoteCount.padEnd(8)} ${acquireCount.padEnd(8)} ${deepenCount.padEnd(8)} ${upgradeCount.padEnd(8)}`,
      );
    }

    // Print VP breakdown diagnostics
    console.log(`\n=== ${nPlayers}-Player VP Breakdown (avg per game) ===`);
    console.log(
      `${"Faction".padEnd(15)} ${"Base".padEnd(8)} ${"Track".padEnd(8)} ${"Majority".padEnd(10)} ${"Network".padEnd(10)} ${"Doctrine".padEnd(10)} ${"Relic".padEnd(8)}`,
    );
    console.log("-".repeat(75));

    for (const faction of FACTION_KEYS) {
      const diag = diagnostics[faction];
      if (diag.actionDist.gameCount === 0) continue;

      const gameCount = diag.actionDist.gameCount;
      const base = diag.vpBreakdown["final.base"]
        ? (diag.vpBreakdown["final.base"] / gameCount).toFixed(2)
        : "0.00";
      const track = diag.vpBreakdown["final.track"]
        ? (diag.vpBreakdown["final.track"] / gameCount).toFixed(2)
        : "0.00";
      const majority = diag.vpBreakdown["final.majority"]
        ? (diag.vpBreakdown["final.majority"] / gameCount).toFixed(2)
        : "0.00";
      const network = diag.vpBreakdown["final.network"]
        ? (diag.vpBreakdown["final.network"] / gameCount).toFixed(2)
        : "0.00";
      const doctrine = diag.vpBreakdown["final.doctrine"]
        ? (diag.vpBreakdown["final.doctrine"] / gameCount).toFixed(2)
        : "0.00";
      const relic = diag.vpBreakdown["final.relic"]
        ? (diag.vpBreakdown["final.relic"] / gameCount).toFixed(2)
        : "0.00";

      console.log(
        `${faction.padEnd(15)} ${base.padEnd(8)} ${track.padEnd(8)} ${majority.padEnd(10)} ${network.padEnd(10)} ${doctrine.padEnd(10)} ${relic.padEnd(8)}`,
      );
    }

    // Print per-bot arena stats
    if (arena) {
      console.log(`\n=== ${nPlayers}-Player Arena: ${arena[0]} vs ${arena[1]} ===`);
      for (const botName of Object.keys(botStats)) {
        const stats = botStats[botName];
        const winPct = ((stats.wins / stats.games) * 100).toFixed(1);
        console.log(`${botName.padEnd(15)} ${winPct.padEnd(8)}%  (${stats.wins}/${stats.games})`);
      }
    }
  }
}

run();
