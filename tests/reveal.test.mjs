import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

function element({ reveal = true, entered = false, children = [] } = {}) {
  const classes = new Set([...(reveal ? ["rv-anim"] : []), ...(entered ? ["in"] : [])]);
  return {
    nodeType: 1,
    classList: { add: (value) => classes.add(value), contains: (value) => classes.has(value) },
    matches: (selector) => selector === ".rv-anim" && reveal,
    querySelectorAll: () => children.flatMap((child) => [
      ...(child.matches(".rv-anim") ? [child] : []), ...child.querySelectorAll(".rv-anim"),
    ]),
  };
}

async function mount({ children = [], reduce = false, intersection = true, mutation = true } = {}) {
  const main = element({ reveal: false, children });
  const observers = [];
  const mutations = [];
  let effect;
  class IntersectionObserver {
    targets = new Set();
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.targets.add(target); }
    unobserve(target) { this.targets.delete(target); }
    disconnect() { this.targets.clear(); this.disconnected = true; }
  }
  class MutationObserver {
    constructor(callback) { this.callback = callback; mutations.push(this); }
    observe(root, options) { this.root = root; this.options = options; }
    disconnect() { this.disconnected = true; }
  }
  const context = vm.createContext({
    window: {
      matchMedia: () => ({ matches: reduce }),
      ...(intersection ? { IntersectionObserver } : {}),
      ...(mutation ? { MutationObserver } : {}),
    },
    document: { getElementById: (id) => id === "main" ? main : null },
    IntersectionObserver, MutationObserver,
  });
  const source = await readFile(new URL("../components/Reveal.jsx", import.meta.url), "utf8");
  const module = new vm.SourceTextModule(source, { context });
  await module.link((specifier) => {
    assert.equal(specifier, "react");
    return new vm.SyntheticModule(["useEffect"], function () {
      this.setExport("useEffect", (callback) => { effect = callback; });
    }, { context });
  });
  await module.evaluate();
  assert.equal(module.namespace.default(), null);
  return { main, observers, mutations, cleanup: effect() };
}

test("observes initial sections and only animates each one on entry", async () => {
  const first = element();
  const alreadyEntered = element({ entered: true });
  const { observers, cleanup } = await mount({ children: [first, alreadyEntered] });
  const observer = observers[0];
  assert.deepEqual([...observer.targets], [first]);
  observer.callback([{ target: first, isIntersecting: false }]);
  assert.equal(first.classList.contains("in"), false);
  observer.callback([{ target: first, isIntersecting: true }]);
  assert.equal(first.classList.contains("in"), true);
  assert.equal(observer.targets.size, 0);
  cleanup();
});

test("persistent layout observes Home/About replacements without a reload", async () => {
  const home = element();
  const about = element();
  const wrapper = element({ reveal: false, children: [about] });
  const { main, observers, mutations, cleanup } = await mount({ children: [home] });
  const observer = observers[0];
  const changes = mutations[0];
  assert.equal(changes.root, main);
  assert.equal(changes.options.childList, true);
  assert.equal(changes.options.subtree, true);
  assert.equal(changes.options.attributes, undefined);
  changes.callback([{ removedNodes: [home], addedNodes: [wrapper] }]);
  assert.deepEqual([...observer.targets], [about]);
  observer.callback([{ target: about, isIntersecting: true }]);
  assert.equal(about.classList.contains("in"), true);
  changes.callback([{ removedNodes: [wrapper], addedNodes: [home] }]);
  assert.deepEqual([...observer.targets], [home]);
  cleanup();
  assert.equal(observer.disconnected, true);
  assert.equal(changes.disconnected, true);
});

test("an initially empty page still observes streamed sections and ignores text nodes", async () => {
  const { observers, mutations, cleanup } = await mount();
  const lateSection = element();
  mutations[0].callback([{ removedNodes: [], addedNodes: [{ nodeType: 3 }, lateSection] }]);
  assert.deepEqual([...observers[0].targets], [lateSection]);
  cleanup();
});

test("reduced motion and unsupported IntersectionObserver do not require animations", async () => {
  for (const options of [{ reduce: true }, { intersection: false }]) {
    const result = await mount({ children: [element()], ...options });
    assert.equal(result.observers.length, 0);
    assert.equal(result.mutations.length, 0);
    assert.equal(result.cleanup, undefined);
  }
});

test("missing MutationObserver still supports initial content without errors", async () => {
  const section = element();
  const { observers, mutations, cleanup } = await mount({ children: [section], mutation: false });
  assert.deepEqual([...observers[0].targets], [section]);
  assert.equal(mutations.length, 0);
  cleanup();
});

test("CSS is visible without JavaScript, before observer entry, and after animation ends", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.rv-anim\{opacity:1;transform:none\}/);
  assert.match(css, /\.rv-anim\.in\{animation:reveal-in \.6s ease\}/);
  assert.match(css, /prefers-reduced-motion:reduce\)\{\s*\.rv-anim\.in\{animation:none\}/);
  assert.doesNotMatch(css, /reveal-ready/);
});
