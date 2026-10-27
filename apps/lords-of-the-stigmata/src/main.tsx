import "./styles.css";
import "./locales/index.ts";
import { createRoot } from "react-dom/client";
import App from "./components/App.tsx";

createRoot(document.getElementById("root")!).render(<App />);
