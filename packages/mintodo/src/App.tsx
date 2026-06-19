import { Canvas } from "./components/Canvas";
import { EditModal } from "./components/EditModal";
import { HelpModal } from "./components/HelpModal";
import { ShortcutHint } from "./components/ShortcutHint";
import { StatsPanel } from "./components/StatsPanel";
import { Toolbar } from "./components/Toolbar";
import { ZoomControls } from "./components/ZoomControls";
import { useKeyboard } from "./hooks/use-keyboard";
import { MindProvider } from "./hooks/use-mind-store";
import { useStorageSync } from "./hooks/use-storage-sync";

function Shell() {
  useStorageSync();
  useKeyboard();
  return (
    <div className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 h-screen w-screen overflow-hidden select-none font-sans">
      <Toolbar />
      <Canvas />
      <ZoomControls />
      <StatsPanel />
      <ShortcutHint />
      <EditModal />
      <HelpModal />
    </div>
  );
}

export function App() {
  return (
    <MindProvider>
      <Shell />
    </MindProvider>
  );
}
