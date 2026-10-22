import { useEffect, useRef, useState } from "react";
import { AcquisitionModal } from "./components/AcquisitionModal";
import { DayTransition } from "./components/DayTransition";
import { HandBar } from "./components/HandBar";
import { FlowStrip } from "./components/FlowStrip";
import { Header } from "./components/Header";
import { HelpModal } from "./components/HelpModal";
import { TeamBoard } from "./components/TeamBoard";
import { LogPanel } from "./components/LogPanel";
import { NewGameModal } from "./components/NewGameModal";
import { OpenTasks } from "./components/OpenTasks";
import { ResultScreen } from "./components/ResultScreen";
import { TeamPanel } from "./components/TeamPanel";
import { TurnBanner } from "./components/TurnBanner";
import { useGame } from "./store";

export function App() {
  const { state, dispatch } = useGame();
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [aiTab, setAiTab] = useState("p2");
  const [helpOpen, setHelpOpen] = useState(false);
  const [newGameOpen, setNewGameOpen] = useState(false);
  const [dayBanner, setDayBanner] = useState<number | null>(null);
  const previousDay = useRef(state.day);
  const initialAcquisitionId = useRef(state.lastAcquisition?.id ?? null);
  const [dismissedAcquisitionId, setDismissedAcquisitionId] = useState<string | null>(
    initialAcquisitionId.current,
  );

  const human = state.players.find((player) => player.isHuman);
  const humanAcquisition =
    state.lastAcquisition && state.lastAcquisition.recipientId === human?.id
      ? state.lastAcquisition
      : null;
  const showAcquisition =
    humanAcquisition !== null && humanAcquisition.id !== dismissedAcquisitionId;
  const selectedCard = human?.hand.find((card) => card.id === selectedCardId) ?? null;
  const handKey = human?.hand.map((card) => card.id).join(",") ?? "";

  useEffect(() => {
    setSelectedCardId(null);
  }, [handKey, state.phase, state.day]);

  useEffect(() => {
    if (state.day === previousDay.current) return;
    previousDay.current = state.day;
    setDayBanner(state.day);
    const timer = setTimeout(() => setDayBanner(null), 1600);
    return () => clearTimeout(timer);
  }, [state.day]);

  useEffect(() => {
    if (state.phase !== "ai" || showAcquisition) return;
    const timer = setTimeout(() => dispatch({ type: "RUN_AI_TURN" }), 550);
    return () => clearTimeout(timer);
  }, [state.phase, state.activePlayerIndex, showAcquisition, dispatch]);

  useEffect(() => {
    if (state.phase !== "roundEnd" || showAcquisition) return;
    const timer = setTimeout(() => dispatch({ type: "END_ROUND" }), 550);
    return () => clearTimeout(timer);
  }, [state.phase, state.day, showAcquisition, dispatch]);

  useEffect(() => {
    if (state.phase !== "ai") return;
    const player = state.players[state.activePlayerIndex];
    if (player) setAiTab(player.id);
  }, [state.phase, state.activePlayerIndex, state.players]);

  if (state.phase === "over") {
    return <ResultScreen state={state} dispatch={dispatch} />;
  }

  return (
    <div className="flow-root pb-44">
      <Header
        state={state}
        onHelp={() => setHelpOpen(true)}
        onNewGame={() => setNewGameOpen(true)}
      />
      <FlowStrip state={state} />
      <TurnBanner state={state} selectedCard={selectedCard} />
      <OpenTasks state={state} dispatch={dispatch} />

      <main className="game-table mx-auto mt-2 max-w-[1440px] px-2 pb-4">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <TeamBoard state={state} dispatch={dispatch} selectedCard={selectedCard} />
          </div>
          <aside className="min-w-0 space-y-2">
            <TeamPanel state={state} aiTab={aiTab} onSelectAi={setAiTab} />
            <LogPanel log={state.log} />
          </aside>
        </div>
      </main>

      <HandBar
        state={state}
        dispatch={dispatch}
        selectedCardId={selectedCardId}
        onSelect={setSelectedCardId}
      />
      {dayBanner !== null && (
        <DayTransition key={dayBanner} day={dayBanner} totalDays={state.totalDays} />
      )}
      {showAcquisition && humanAcquisition && (
        <AcquisitionModal
          report={humanAcquisition}
          debtLimit={state.rules.debtLimit}
          onClose={() => setDismissedAcquisitionId(humanAcquisition.id)}
        />
      )}
      {helpOpen && <HelpModal rules={state.rules} onClose={() => setHelpOpen(false)} />}
      {newGameOpen && (
        <NewGameModal
          currentDays={state.totalDays}
          currentAiCount={state.players.filter((player) => !player.isHuman).length}
          onClose={() => setNewGameOpen(false)}
          onStart={(days, aiCount) => {
            setNewGameOpen(false);
            dispatch({ type: "RESTART", days, aiCount });
          }}
        />
      )}
    </div>
  );
}
