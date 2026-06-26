import { SaiflowProvider } from "./store";
import { ProfileBar } from "./components/ProfileBar";

export function App() {
  return (
    <SaiflowProvider>
      <div className="h-full flex flex-col">
        <ProfileBar />
        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 flex flex-col" />
        </div>
      </div>
    </SaiflowProvider>
  );
}
