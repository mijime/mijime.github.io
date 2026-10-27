import { formatNumber, formatPercent, mean, rate } from "../stats";
import { heading, line } from "../format";
import type { RunResult } from "../runner";

export function printAi(results: RunResult[]): void {
  const runs = Math.max(1, results.length);
  const kinds = { play: 0, pull: 0, trash: 0 };
  const phases = { design: 0, dev: 0, test: 0 };
  const scores = { play: 0, pull: 0, trash: 0 };
  let support = 0;
  let substitutions = 0;
  let tokens = 0;
  let actions = 0;

  for (const result of results) {
    for (const decision of result.decisions) {
      actions += 1;
      kinds[decision.kind] += 1;
      scores[decision.kind] += decision.score;
      if (decision.kind === "play" && decision.phase) phases[decision.phase] += 1;
      if (decision.kind === "play" && decision.support) support += 1;
      if (decision.kind === "play" && decision.substitute) substitutions += 1;
    }
    tokens += result.state.analytics.tokensUsed;
  }
  const playTotal = Math.max(1, kinds.play);

  heading(`ai  ${results.length} seeds`);
  line(
    "actions/game",
    `play=${formatNumber(kinds.play / runs)} pull=${formatNumber(kinds.pull / runs)} trash=${formatNumber(kinds.trash / runs)} total=${formatNumber(actions / runs)}`,
  );
  line(
    "play lanes/game",
    `design=${formatNumber(phases.design / runs)} dev=${formatNumber(phases.dev / runs)} test=${formatNumber(phases.test / runs)}`,
  );
  line("support plays", `${formatPercent(rate(support, playTotal))} (${support})`);
  line("substitutions", `${formatPercent(rate(substitutions, playTotal))} (${substitutions})`);
  line("tokens used/game", formatNumber(tokens / runs));
  line(
    "avg chosen score",
    `play=${formatNumber(rate(scores.play, kinds.play))} pull=${formatNumber(rate(scores.pull, kinds.pull))} trash=${formatNumber(rate(scores.trash, kinds.trash))}`,
  );
  line(
    "mean decision score",
    formatNumber(
      mean(results.flatMap((result) => result.decisions.map((decision) => decision.score))),
      2,
    ),
  );
  console.log("  note: greedy 1-step heuristic. Not a lookahead/optimal solver.");
}
