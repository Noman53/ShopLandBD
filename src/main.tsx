import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
if (supabaseUrl) {
  const preconnect = document.createElement("link");
  preconnect.rel = "preconnect";
  preconnect.href = new URL(supabaseUrl).origin;
  preconnect.crossOrigin = "anonymous";
  document.head.appendChild(preconnect);
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
