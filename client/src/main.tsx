import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator) {
  let reloading = false;
  const hadControllerAtBoot = !!navigator.serviceWorker.controller;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    if (!hadControllerAtBoot) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        const promptUpdate = (worker: ServiceWorker) => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            worker.postMessage({ type: "SKIP_WAITING" });
            return;
          }
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              worker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        };

        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (installing) promptUpdate(installing);
        });

        if (reg.installing) promptUpdate(reg.installing);
        if (reg.waiting && navigator.serviceWorker.controller) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        reg.update().catch(() => {});

        setInterval(() => {
          reg.update().catch(() => {});
        }, 60 * 60 * 1000);
      })
      .catch(() => {});
  });
}
