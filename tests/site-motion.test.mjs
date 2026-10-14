import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const flush = () => new Promise(resolve => setImmediate(resolve));
async function mount({ reduce = false, fine = true, failedImport = false, deferredImport = false } = {}) {
  const instances = [], observers = [], bodyClasses = new Set();
  const query = matches => ({ matches, listeners: new Set(), addEventListener(_, fn) { this.listeners.add(fn); }, removeEventListener(_, fn) { this.listeners.delete(fn); } });
  const reduced = query(reduce), desktop = query(fine);
  const body = { style: {}, classList: { contains: value => bodyClasses.has(value) } };
  let effect, imports = 0, releaseImport;
  const gate = deferredImport ? new Promise(resolve => { releaseImport = resolve; }) : Promise.resolve();
  class Lenis {
    constructor(options) { this.options = options; this.isStopped = false; this.stops = 0; this.starts = 0; instances.push(this); }
    stop() { this.isStopped = true; this.stops++; }
    start() { this.isStopped = false; this.starts++; }
    destroy() { this.destroyed = true; }
  }
  class MutationObserver {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(root, options) { this.root = root; this.options = options; }
    disconnect() { this.disconnected = true; }
  }
  const context = vm.createContext({ window: { matchMedia: value => value.includes("reduced-motion") ? reduced : desktop }, document: { body }, MutationObserver });
  const library = new vm.SyntheticModule(["default"], function () { this.setExport("default", Lenis); }, { context });
  await library.link(() => {}); await library.evaluate();
  const source = await readFile(new URL("../components/SmoothScroll.jsx", import.meta.url), "utf8");
  const module = new vm.SourceTextModule(source, { context, importModuleDynamically: async specifier => {
    assert.equal(specifier, "lenis"); imports++; await gate;
    if (failedImport) throw Error("Offline enhancement");
    return library;
  } });
  await module.link(specifier => {
    if (specifier === "react") return new vm.SyntheticModule(["useEffect"], function () { this.setExport("useEffect", fn => { effect = fn; }); }, { context });
    assert.equal(specifier, "next/navigation");
    return new vm.SyntheticModule(["usePathname"], function () { this.setExport("usePathname", () => "/events"); }, { context });
  });
  await module.evaluate(); assert.equal(module.namespace.default(), null);
  const cleanup = effect(); await flush();
  return { instances, observers, body, bodyClasses, reduced, desktop, cleanup, releaseImport, get imports() { return imports; } };
}

test("touch and reduced-motion visitors do not load a wheel-scrolling enhancement", async () => {
  for (const settings of [{ reduce: true }, { fine: false }]) {
    const fixture = await mount(settings);
    assert.equal(fixture.imports, 0); assert.equal(fixture.instances.length, 0);
    fixture.cleanup();
  }
});
test("desktop scrolling keeps native touch, anchors, and nested controls available", async () => {
  const fixture = await mount(), engine = fixture.instances[0];
  assert.equal(engine.options.smoothWheel, true);
  assert.equal(engine.options.syncTouch, false);
  assert.equal(engine.options.respectReducedMotion, true);
  assert.ok(engine.options.anchors);
  assert.equal(engine.options.stopInertiaOnNavigate, true);
  const node = selector => ({ matches: list => list.split(",").map(value => value.trim()).includes(selector) });
  for (const selector of [".drawer", ".mobile-menu", "[role='dialog']", "textarea", "select", ".pills"])
    assert.equal(engine.options.prevent(node(selector)), true, selector);
  assert.equal(engine.options.prevent(node("main")), false);
  assert.equal(engine.options.virtualScroll({ event: { shiftKey: true } }), false);
  fixture.cleanup();
});
test("open drawers and menus pause the page, and closing them resumes it once", async () => {
  const fixture = await mount(), engine = fixture.instances[0], observer = fixture.observers[0];
  fixture.body.style.overflow = "hidden"; observer.callback(); observer.callback();
  assert.equal(engine.isStopped, true); assert.equal(engine.stops, 1);
  fixture.body.style.overflow = ""; observer.callback();
  assert.equal(engine.isStopped, false); assert.equal(engine.starts, 1);
  fixture.bodyClasses.add("mobile-nav-open"); observer.callback();
  assert.equal(engine.isStopped, true);
  fixture.bodyClasses.clear(); observer.callback();
  assert.equal(engine.isStopped, false);
  fixture.cleanup(); assert.equal(observer.disconnected, true);
  assert.doesNotThrow(() => observer.callback());
});
test("changing motion or pointer preferences cleans up the engine and safely enables it again", async () => {
  const fixture = await mount();
  fixture.reduced.matches = true; fixture.reduced.listeners.forEach(fn => fn()); await flush();
  assert.equal(fixture.instances[0].destroyed, true);
  fixture.reduced.matches = false; fixture.reduced.listeners.forEach(fn => fn()); await flush();
  assert.equal(fixture.instances.length, 2);
  fixture.desktop.matches = false; fixture.desktop.listeners.forEach(fn => fn()); await flush();
  assert.equal(fixture.instances[1].destroyed, true);
  fixture.cleanup(); assert.equal(fixture.reduced.listeners.size, 0); assert.equal(fixture.desktop.listeners.size, 0);
});
test("late or failed enhancement downloads cannot trap scrolling after navigation", async () => {
  const late = await mount({ deferredImport: true });
  late.cleanup(); late.releaseImport(); await flush();
  assert.equal(late.instances.length, 0);
  const offline = await mount({ failedImport: true });
  assert.equal(offline.instances.length, 0); offline.cleanup();
});
