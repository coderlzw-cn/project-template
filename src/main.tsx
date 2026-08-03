import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/App.tsx";
import ErrorBoundary from "@/components/ErrorBoundary";
import "@/assets/styles/global.css";

import { Inspector } from "react-dev-inspector";
import "./i18n";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <Inspector />
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
