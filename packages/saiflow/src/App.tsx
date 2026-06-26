import { SaiflowProvider } from "./store";
import { ProfileBar } from "./components/ProfileBar";
import { EditorPanel } from "./components/EditorPanel";
import { ResultTable } from "./components/ResultTable";

export function App() {
  return (
    <SaiflowProvider>
      <div className="h-full flex flex-col">
        <ProfileBar />
        <div className="flex-1 overflow-hidden flex">
          <div className="w-96 flex-shrink-0 border-r border-(--border)">
            <EditorPanel />
          </div>
          <div className="flex-1">
            <ResultTable />
          </div>
        </div>
      </div>
    </SaiflowProvider>
  );
}
