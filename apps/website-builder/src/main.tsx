import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { SessionProvider } from "./account/session";
import { I18nProvider } from "./i18n/I18nProvider";
import "./ui/builder.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <I18nProvider>
      <SessionProvider>
        <App />
      </SessionProvider>
    </I18nProvider>
  </StrictMode>,
);
