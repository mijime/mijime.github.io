import { useEffect, useRef, useState } from "react";
import { AcquisitionModal } from "./components/AcquisitionModal";
import { DayTransition } from "./components/DayTransition";
import { DebtWarning } from "./components/DebtWarning";
import { HandBar } from "./components/HandBar";
import { Header } from "./components/Header";
import { HelpModal } from "./components/HelpModal";
import { IntroScreen } from "./components/IntroScreen";
import { OpsBoard } from "./components/OpsBoard";
import { LogPanel } from "./components/LogPanel";
import { NewGameModal } from "./components/NewGameModal";
import { ResultScreen } from "./components/ResultScreen";
import { TacticalFrame } from "./components/TacticalFrame";
import { TeamPanel } from "./components/TeamPanel";
import { TurnBanner } from "./components/TurnBanner";
import { loadGame, useGame } from "./store";

const INTRO_KEY = "flowdeck:intro:v1";

function shouldShowIntro(): boolean {
  try {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("auto")) {
      return false;
    }
    return !localStorage.getItem(INTRO_KEY);
  } catch {
    return false;
  }
}

export function App() {
  const { state, dispatch } = useGame();
  const [introMode, setIntroMode] = useState<"first" | "review" | null>(() => {
    if (!shouldShowIntro()) return null;
    return loadGame() === null ? "first" : "review";
  });
  const [autoMode, setAutoMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).has("auto");
  });
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
    if (!autoMode || state.phase !== "human" || showAcquisition) return;
    const timer = setTimeout(() => dispatch({ type: "AUTO_STEP" }), 450);
    return () => clearTimeout(timer);
  }, [autoMode, state.phase, state.activePlayerIndex, state.day, showAcquisition, dispatch]);

  useEffect(() => {
    if (!autoMode || !showAcquisition || !humanAcquisition) return;
    const timer = setTimeout(() => setDismissedAcquisitionId(humanAcquisition.id), 700);
    return () => clearTimeout(timer);
  }, [autoMode, showAcquisition, humanAcquisition]);

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
    <div className="flow-root relative pb-52" data-theme="dark">
      <TacticalFrame />
      <div className="relative z-10">
        <Header
          state={state}
          onHelp={() => setHelpOpen(true)}
          onIntro={() => setIntroMode("review")}
          onNewGame={() => setNewGameOpen(true)}
          autoMode={autoMode}
          onStopAuto={() => setAutoMode(false)}
        />
        <DebtWarning debt={state.teamDebt} limit={state.rules.debtLimit} />
        <TurnBanner state={state} selectedCard={selectedCard} />

        <main className="mx-auto mt-2 flex max-w-[1600px] flex-col gap-2 px-2 pb-4 lg:flex-row">
          <aside className="order-2 flex w-full shrink-0 flex-col gap-2 lg:order-1 lg:w-[230px]">
            <TeamPanel state={state} aiTab={aiTab} onSelectAi={setAiTab} />
            <div className="min-h-0 lg:flex-1">
              <LogPanel log={state.log} />
            </div>
          </aside>
          <div className="order-1 min-w-0 flex-1 lg:order-2">
            <OpsBoard state={state} dispatch={dispatch} selectedCard={selectedCard} />
          </div>
        </main>

        <HandBar
          state={state}
          dispatch={dispatch}
          selectedCardId={selectedCardId}
          onSelect={setSelectedCardId}
        />
      </div>
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
      {introMode && (
        <IntroScreen
          review={introMode === "review"}
          onStart={(days, aiCount) => {
            try {
              localStorage.setItem(INTRO_KEY, "1");
            } catch {
              // 保存できなくても開始する
            }
            setIntroMode(null);
            dispatch({ type: "RESTART", days, aiCount });
          }}
          onClose={() => {
            try {
              localStorage.setItem(INTRO_KEY, "1");
            } catch {
              // 保存できなくても閉じる
            }
            setIntroMode(null);
          }}
        />
      )}
    </div>
  );
}
