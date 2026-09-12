import { JSDOM } from "jsdom";
import { registerHooks } from "node:module";
// Match the image implementation used by the Vite/Vinext application.
registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(
      specifier === "next/image" ? "vinext/shims/image" : specifier,
      context,
    );
  },
});
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost",
});
for (const key of [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "HTMLInputElement",
  "Node",
  "localStorage",
  "sessionStorage",
  "getComputedStyle",
  "Event",
  "MouseEvent",
]) {
  Object.defineProperty(globalThis, key, {
    value: dom.window[key],
    configurable: true,
    writable: true,
  });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.self = dom.window;
