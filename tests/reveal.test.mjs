import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

function element({ reveal = true, entered = false, children = [], top = 1200 } = {}) {
  const classes = new Set([...(reveal ? ["rv-anim"] : []), ...(entered ? ["in"] : [])]);
  return {
    nodeType: 1,
    dataset: {},
    style: { values: {}, setProperty(key, value) { this.values[key] = value; } },
    getBoundingClientRect: () => ({ top }),
    classList: { add: (value) => classes.add(value), contains: (value) => classes.has(value) },
    matches: (selector) => selector === ".rv-anim" && reveal,
    querySelectorAll: () => children.flatMap((child) => [
      ...(child.matches(".rv-anim") ? [child] : []), ...child.querySelectorAll(".rv-anim"),
    ]),
  };
}

async function mount({ children = [], reduce = false, intersection = true, mutation = true } = {}) {
  const main = element({ reveal: false, children });
  children.forEach(child => { child.parentElement = main; });
  const observers = [];
  const mutations = [];
  let effect;
  class IntersectionObserver {
    targets = new Set();
    constructor(callback, options) { this.callback = callback; this.options = options; observers.push(this); }
    observe(target) { this.targets.add(target); }
    unobserve(target) { this.targets.delete(target); }
    disconnect() { this.targets.clear(); this.disconnected = true; }
  }
  class MutationObserver {
    constructor(callback) { this.callback = callback; mutations.push(this); }
    observe(root, options) { this.root = root; this.options = options; }
    disconnect() { this.disconnected = true; }
  }
  const listeners = new Set();
  const preference = { matches: reduce, addEventListener: (_,callback)=>listeners.add(callback), removeEventListener: (_,callback)=>listeners.delete(callback) };
  const context = vm.createContext({
    window: {
      innerHeight: 1000,
      matchMedia: () => preference,
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
  return { main, observers, mutations, preference, listeners, cleanup: effect() };
}

test("observes initial sections and only animates each one on entry", async () => {
  const first = element();
  const alreadyEntered = element({ entered: true });
  const { observers, cleanup } = await mount({ children: [first, alreadyEntered] });
  const observer = observers[0];
  assert.deepEqual([...observer.targets], [first]);
  assert.equal(first.dataset.reveal, "pending");
  assert.equal(observer.options.threshold, 0);
  assert.equal(observer.options.rootMargin, "0px 0px 64px 0px");
  observer.callback([{ target: first, isIntersecting: false }]);
  assert.equal(first.classList.contains("in"), false);
  observer.callback([{ target: first, isIntersecting: true }]);
  assert.equal(first.classList.contains("in"), true);
  assert.equal(first.dataset.reveal, "entered");
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
    result.cleanup();
  }
});

test("missing MutationObserver still supports initial content without errors", async () => {
  const section = element();
  const { observers, mutations, cleanup } = await mount({ children: [section], mutation: false });
  assert.deepEqual([...observers[0].targets], [section]);
  assert.equal(mutations.length, 0);
  cleanup();
});

test("first paint stays readable and only prepared offscreen elements wait for entry", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.rv-anim\{opacity:1;transform:none\}/);
  const experience = await readFile(new URL("../app/experience.css", import.meta.url), "utf8");
  assert.match(experience, /\.rv-anim \{ animation: content-reveal 760ms/);
  assert.match(experience, /\.rv-anim\[data-reveal="pending"\]/);
  assert.match(experience, /\.rv-anim:focus-within \{ animation: none; opacity: 1/);
  assert.doesNotMatch(css, /@keyframes reveal-in/);
});

test("already visible content is never hidden or replayed by hydration", async()=>{
  const visible=element({top:120});
  const {observers,cleanup}=await mount({children:[visible]});
  assert.equal(visible.dataset.reveal,"entered");
  assert.equal(observers[0].targets.size,0);
  assert.equal(visible.style.values['--reveal-delay'],undefined);
  cleanup();
});
test("nearby sections stagger with a bounded delay and never replay on a second entry", async()=>{
  const cards=Array.from({length:8},()=>element());
  const {observers,cleanup}=await mount({children:cards});
  const entries=cards.map(target=>({target,isIntersecting:true}));
  observers[0].callback(entries);
  assert.deepEqual(cards.map(card=>card.style.values['--reveal-delay']),['0ms','60ms','120ms','180ms','180ms','180ms','180ms','180ms']);
  observers[0].callback([...entries].reverse());
  assert.equal(cards[0].style.values['--reveal-delay'],'0ms');
  cleanup();
});
test("a live reduced-motion change and unmount release all pending content", async()=>{
  const section=element();
  const {preference,listeners,observers,cleanup}=await mount({children:[section]});
  assert.equal(section.dataset.reveal,'pending');
  preference.matches=true;listeners.forEach(callback=>callback());
  assert.equal(section.dataset.reveal,undefined);
  assert.equal(observers[0].disconnected,true);
  preference.matches=false;listeners.forEach(callback=>callback());
  assert.equal(section.dataset.reveal,'pending');
  cleanup();
  assert.equal(section.dataset.reveal,undefined);
  assert.equal(listeners.size,0);
});
