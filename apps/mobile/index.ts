import { registerRootComponent } from "expo";
import App from "./App";

// On web, surface any startup crash on the page itself (instead of a blank
// white screen) so problems are visible without opening devtools.
declare const window: any;
declare const document: any;
if (typeof window !== "undefined" && typeof document !== "undefined") {
  const showError = (msg: string) => {
    let el = document.getElementById("bw-error-overlay");
    if (!el) {
      el = document.createElement("pre");
      el.id = "bw-error-overlay";
      el.style.cssText =
        "position:fixed;top:0;left:0;right:0;max-height:50vh;overflow:auto;background:#FDECEA;color:#B3261E;padding:14px;z-index:99999;white-space:pre-wrap;font-size:12px;margin:0;border-bottom:2px solid #B3261E";
      document.body.appendChild(el);
    }
    el.textContent = "App error:\n" + msg;
  };
  window.addEventListener("error", (e: any) => showError(e?.error?.stack ?? e.message ?? String(e)));
  window.addEventListener("unhandledrejection", (e: any) =>
    showError("Unhandled promise rejection:\n" + (e?.reason?.stack ?? String(e?.reason)))
  );
}

registerRootComponent(App);
