import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ShareView from "../components/share-view";
import type { SharePayload } from "../utils";
import "../index.css";

const EMPTY: SharePayload = { title: "Shared Conversation", messages: [] };

function readShareData(): SharePayload {
  const el = document.getElementById("share-data");
  if (!el || !el.textContent) {
    return EMPTY;
  }
  try {
    const parsed = JSON.parse(el.textContent);
    if (parsed && Array.isArray(parsed.messages)) {
      return parsed as SharePayload;
    }
  } catch {
    // Template not yet populated (e.g. opened before injection) — render empty.
  }
  return EMPTY;
}

const data = readShareData();
document.title = data.title ? `${data.title} · Claude Run` : "Claude Run";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ShareView data={data} />
  </StrictMode>,
);
