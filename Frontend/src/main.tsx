import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./themes/workspace.css";
import "./themes/oceanPalette.css";
import { usesIntelligentTheme } from "./themes/intelligentTokens";

document.body.classList.toggle(
  "dsp-intelligent",
  usesIntelligentTheme(window.location.pathname),
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
