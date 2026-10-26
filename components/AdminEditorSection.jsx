"use client";

import AdminIcon from "./AdminIcon";

export function revealInvalidEditorField(event) {
  let parent = event.target.parentElement;
  while (parent) {
    if (parent.tagName === "DETAILS") parent.open = true;
    parent = parent.parentElement;
  }
}

export function AdminEditorNav({ sections }) {
  return <nav className="editor-section-nav" aria-label="Editor sections">
    {sections.map(([id, title]) => <button key={id} type="button" onClick={event => {
      const scope = event.currentTarget.closest("form");
      const section = scope?.querySelector(`[data-editor-section="${id}"]`);
      if (!section) return;
      section.open = true;
      section.querySelector("summary")?.focus({ preventScroll: true });
      section.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    }}>{title}</button>)}
  </nav>;
}

export default function AdminEditorSection({ id, title, summary, icon = "edit", defaultOpen = false, children }) {
  return <details className="editor-section" data-editor-section={id} open={defaultOpen} onInvalidCapture={revealInvalidEditorField}>
    <summary><span className="editor-section-icon"><AdminIcon name={icon}/></span><span><b>{title}</b>{summary && <small>{summary}</small>}</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg></summary>
    <div className="editor-section-body">{children}</div>
  </details>;
}
