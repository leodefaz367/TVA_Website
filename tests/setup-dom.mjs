import { JSDOM } from "jsdom";
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
