import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const focusSource = await readFile(new URL("../lib/focus-trap.js", import.meta.url), "utf8");
function fixture({ active = 0, blocked = [], disabled = [] } = {}) {
  const document = {};
  const controls = Array.from({ length: 3 }, (_, index) => ({
    closest: () => blocked.includes(index),
    matches: () => disabled.includes(index),
    getClientRects: () => [1],
    focus() { document.activeElement = this; },
  }));
  document.activeElement = controls[active] || {};
  const context = vm.createContext({ document });
  vm.runInContext(focusSource.replace("export function", "function"), context);
  const container = {
    querySelectorAll: () => controls,
    contains: (el) => controls.includes(el),
  };
  const event = { key: "Tab", shiftKey: false, preventDefault() { this.prevented = true; } };
  return { context, document, controls, container, event };
}

test("drawer and mobile navigation wrap forward keyboard focus", () => {
  const f = fixture({ active: 2 });
  f.context.trapFocus(f.container, f.event);
  assert.equal(f.document.activeElement, f.controls[0]);
  assert.equal(f.event.prevented, true);
});
test("reverse tab wraps to the last control", () => {
  const f = fixture(); f.event.shiftKey = true;
  f.context.trapFocus(f.container, f.event);
  assert.equal(f.document.activeElement, f.controls[2]);
});
test("hidden, inert, and aria-hidden content is excluded", () => {
  const f = fixture({ active: 2, blocked: [0] });
  f.context.trapFocus(f.container, f.event);
  assert.equal(f.document.activeElement, f.controls[1]);
});
test("focus outside an open panel is brought back inside", () => {
  const f = fixture({ active: -1 });
  f.context.trapFocus(f.container, f.event);
  assert.equal(f.document.activeElement, f.controls[0]);
});
test("disabled and negative-tabindex controls are skipped", () => {
  const f = fixture({ active: 2, disabled: [0] });
  f.context.trapFocus(f.container, f.event);
  assert.equal(f.document.activeElement, f.controls[1]);
});
test("normal typing, intermediate tab, and empty containers are not intercepted", () => {
  for (const key of ["Tab", "ArrowDown", "a"]) {
    const f = fixture({ active: 1 }); f.event.key = key;
    f.context.trapFocus(f.container, f.event);
    assert.equal(f.event.prevented, undefined);
  }
  const f = fixture({ blocked: [0, 1, 2] });
  f.context.trapFocus(f.container, f.event);
  f.context.trapFocus(null, f.event);
  assert.equal(f.event.prevented, undefined);
});
test("mobile CSS constrains native dates without removing the picker", async () => {
  const css = await readFile(new URL("../app/experience.css", import.meta.url), "utf8");
  const dates = css.match(/\.field input\[type="date"\][^{]*\{([^}]+)\}/)[1];
  assert.match(dates, /min-inline-size: 0/);
  assert.match(dates, /max-inline-size: 100%/);
  assert.match(dates, /-webkit-appearance: none/);
  assert.match(css, /::-webkit-date-and-time-value \{ min-width: 0; text-align: left;/);
  assert.doesNotMatch(css, /calendar-picker-indicator[^}]*display:\s*none/);
});
test("motion is finite, visible by default, and disabled for reduced motion", async () => {
  const css = await readFile(new URL("../app/experience.css", import.meta.url), "utf8");
  assert.match(css, /prefers-reduced-motion: no-preference/);
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*animation: none !important/);
  assert.doesNotMatch(css, /infinite|\.rv-anim\s*\{[^}]*opacity:\s*0/);
  assert.match(css, /\.stepper button, \.ci \.stepper button \{ width: 44px; height: 44px/);
});
