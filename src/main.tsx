import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Bridge: converte hash route (/#/path) para path real (/path)
// Necessário porque o og-metadata redireciona para /#/imovel/X
// mas o app usa BrowserRouter que ignora o hash
if (window.location.hash.startsWith('#/')) {
  const realPath = window.location.hash.slice(1); // Remove o '#'
  window.history.replaceState(null, '', realPath);
}

createRoot(document.getElementById("root")!).render(<App />);
