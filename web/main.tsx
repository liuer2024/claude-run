import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app";
import { ThemeProvider } from "./theme-context";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
);
