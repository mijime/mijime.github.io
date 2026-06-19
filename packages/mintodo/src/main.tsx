import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

createRoot(document.querySelector("#root")!).render(
  <StrictMode>
    <p>mintodo</p>
  </StrictMode>,
);
