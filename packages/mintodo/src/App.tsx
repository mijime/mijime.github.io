import { MindProvider } from "./hooks/use-mind-store";
import { useStorageSync } from "./hooks/use-storage-sync";
import { useKeyboard } from "./hooks/use-keyboard";

function Shell() {
  useStorageSync();
  useKeyboard();
  return (
    <div className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 h-screen w-screen overflow-hidden select-none font-sans">
      <p className="p-8">MindTodo Pro (loading...)</p>
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
