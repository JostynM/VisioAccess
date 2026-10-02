import { StrictMode } from "react";

import {
  createRoot,
} from "react-dom/client";

import "./styles/global.css";
import "./styles/layout.css";
import "./styles/home.css";
import "./styles/pdf.css";
import "./styles/ocr.css";
import "./styles/web.css";
import "./styles/voice.css";
import "./styles/media.css";
import "./styles/accessibility.css";
import "./styles/settings.css";
import "./styles/responsive.css";

import App from "./App.jsx";

createRoot(
  document.getElementById("root"),
).render(
  <StrictMode>
    <App />
  </StrictMode>,
);