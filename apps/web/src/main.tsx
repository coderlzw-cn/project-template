import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/App.tsx";
import "@/assets/style/global.css";

import { Inspector } from "react-dev-inspector";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Inspector />
    <App />
  </StrictMode>,
);
