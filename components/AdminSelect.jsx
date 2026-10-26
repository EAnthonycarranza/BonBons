"use client";

import { Children, isValidElement, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import AdminIcon from "./AdminIcon";

function textOf(children) {
  return Children.toArray(children).map(child => isValidElement(child) ? textOf(child.props.children) : String(child)).join("");
}

function optionsOf(children, group = "", groupDisabled = false) {
  const options = [];
  Children.forEach(children, child => {
    if (!isValidElement(child)) return;
    if (child.type === "option") {
      const label = textOf(child.props.children);
      options.push({ value: String(child.props.value ?? label), label, group, disabled: groupDisabled || Boolean(child.props.disabled) });
    } else {
      options.push(...optionsOf(child.props.children, child.type === "optgroup" ? child.props.label : group, groupDisabled || Boolean(child.props.disabled)));
    }
  });
  return options;
}

/** Keep a real select for forms, labels and assistive technology; enhance its picker. */
export default function AdminSelect({ children, className = "", value, defaultValue, onChange, disabled, ...props }) {
  const id = useId();
  const native = useRef(null);
  const dialog = useRef(null);
  const list = useRef(null);
  const search = useRef(null);
  const typeAhead = useRef({ text: "", at: 0 });
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [label, setLabel] = useState(props["aria-label"] || "Choose an option");
  const [active, setActive] = useState(0);
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const [position, setPosition] = useState({});
  const options = useMemo(() => optionsOf(children), [children]);
  const selected = options.find(option => option.value === String(value ?? uncontrolled ?? options[0]?.value));
  const filtered = options.filter(option => `${option.label} ${option.group}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const searchable = options.length > 6;

  function close() {
    dialog.current?.close();
    setOpen(false);
    native.current?.focus({ preventScroll: true });
  }

  function show() {
    if (!native.current || native.current.matches(":disabled")) return;
    const fieldLabel = native.current.labels?.[0]?.cloneNode(true);
    fieldLabel?.querySelectorAll("select, input, textarea, button, small, svg, [aria-hidden=true]").forEach(node => node.remove());
    setLabel(props["aria-label"] || fieldLabel?.textContent?.replace(/\s+/g, " ").trim() || "Choose an option");
    setQuery("");
    const current = options.findIndex(option => option.value === selected?.value && !option.disabled);
    setActive(current >= 0 ? current : Math.max(0, options.findIndex(option => !option.disabled)));
    setOpen(true);
  }

  function choose(option) {
    if (option.disabled || native.current?.matches(":disabled")) return;
    const select = native.current;
    close();
    // Dispatch the select's normal change event, preserving all existing handlers.
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(select, option.value);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  useEffect(() => {
    if (!open || !dialog.current) return;
    const picker = dialog.current;
    const previousOverflow = document.body.style.overflow;
    const place = () => {
      const rect = native.current.getBoundingClientRect();
      const viewport = window.visualViewport;
      const width = viewport?.width || window.innerWidth;
      const height = viewport?.height || window.innerHeight;
      const top = viewport?.offsetTop || 0;
      if (width <= 760 || (width <= 960 && height <= 500)) {
        setPosition({ left: 10, right: 10, bottom: Math.max(10, window.innerHeight - height - top + 10), top: "auto", width: "auto", maxHeight: Math.min(560, Math.max(160, height - 28)) });
      } else {
        const menuWidth = Math.min(Math.max(rect.width, 280), width - 32);
        const below = height + top - rect.bottom - 16;
        const above = rect.top - top - 16;
        const lift = below < 260 && above > below;
        const maxHeight = Math.min(420, Math.max(160, lift ? above : below));
        setPosition({ left: Math.max(12, Math.min(rect.left, width - menuWidth - 12)), top: lift ? Math.max(top + 12, rect.top - maxHeight - 8) : rect.bottom + 8, bottom: "auto", right: "auto", width: menuWidth, maxHeight });
      }
    };
    place();
    picker.showModal();
    document.body.style.overflow = "hidden";
    (searchable && window.innerWidth > 960 ? search.current : list.current)?.focus({ preventScroll: true });
    window.addEventListener("resize", place);
    window.visualViewport?.addEventListener("resize", place);
    window.visualViewport?.addEventListener("scroll", place);
    return () => {
      picker.close();
      // A containing editor owns an existing lock; never restore its stale lock
      // after that editor has unmounted during navigation.
      if (previousOverflow !== "hidden") document.body.style.overflow = previousOverflow;
      window.removeEventListener("resize", place);
      window.visualViewport?.removeEventListener("resize", place);
      window.visualViewport?.removeEventListener("scroll", place);
    };
  }, [open, searchable]);

  useEffect(() => {
    if (open) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, id, open]);

  function keyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault(); event.stopPropagation(); close(); return;
    }
    if (event.target.closest("button") && !list.current?.contains(event.target)) return;
    if (event.key === "Enter") {
      event.preventDefault();
      if (filtered[active]) choose(filtered[active]);
      return;
    }
    if (event.target !== search.current && event.key === " ") {
      event.preventDefault();
      if (filtered[active]) choose(filtered[active]);
      return;
    }
    if (event.target !== search.current && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      const text = now - typeAhead.current.at < 750 ? typeAhead.current.text + event.key.toLocaleLowerCase() : event.key.toLocaleLowerCase();
      typeAhead.current = { text, at: now };
      const term = [...text].every(letter => letter === text[0]) ? text[0] : text;
      const next = filtered.findIndex((option, index) => index > active && !option.disabled && option.label.toLocaleLowerCase().startsWith(term));
      const first = filtered.findIndex(option => !option.disabled && option.label.toLocaleLowerCase().startsWith(term));
      if (next >= 0 || first >= 0) setActive(next >= 0 ? next : first);
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    // Home/End in the search field still move the text caret.
    if (event.target === search.current && ["Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const enabled = filtered.map((option, index) => option.disabled ? -1 : index).filter(index => index !== -1);
    if (!enabled.length) return;
    const index = enabled.indexOf(active);
    const next = event.key === "Home" ? enabled[0] : event.key === "End" ? enabled.at(-1) : enabled[(index + (event.key === "ArrowDown" ? 1 : -1) + enabled.length) % enabled.length];
    setActive(next);
  }

  return (
    <span className={`admin-select-control ${className}${disabled ? " is-disabled" : ""}`}>
      <select
        {...props}
        ref={native}
        className="admin-select-native"
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        role="combobox"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? `${id}-picker` : undefined}
        onChange={event => { setUncontrolled(event.target.value); onChange?.(event); }}
        onPointerDown={event => { if (event.button === 0) { event.preventDefault(); show(); } }}
        onClick={event => { event.preventDefault(); if (!open) show(); }}
        onKeyDown={event => {
          if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) { event.preventDefault(); show(); }
        }}
      >
        {children}
      </select>
      <span className="admin-select-face" aria-hidden="true">
        <span>{selected?.label || "Choose an option"}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m7 10 5 5 5-5"/></svg>
      </span>
      {open && createPortal(
        <dialog
          ref={dialog}
          id={`${id}-picker`}
          className="admin-select-dialog"
          aria-labelledby={`${id}-title`}
          style={position}
          onKeyDown={keyDown}
          onCancel={event => { event.preventDefault(); event.stopPropagation(); close(); }}
          onClick={event => {
            if (event.target !== event.currentTarget) return;
            const rect = event.currentTarget.getBoundingClientRect();
            if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
          }}
        >
          <div className="admin-select-heading">
            <div><small>Choose an option</small><h2 id={`${id}-title`}>{label}</h2></div>
            <button type="button" onClick={close} aria-label="Close options"><AdminIcon name="close"/></button>
          </div>
          {searchable && <label className="admin-select-search"><AdminIcon name="search"/><input ref={search} type="search" value={query} placeholder="Search options…" aria-label={`Search ${label.toLowerCase()}`} onChange={event => { const next = event.target.value; setQuery(next); const first = options.filter(option => `${option.label} ${option.group}`.toLocaleLowerCase().includes(next.trim().toLocaleLowerCase())).findIndex(option => !option.disabled); setActive(Math.max(0, first)); }}/></label>}
          <div ref={list} role="listbox" tabIndex={0} aria-label={label} aria-activedescendant={filtered[active] ? `${id}-option-${active}` : undefined} className="admin-select-options">
            {filtered.map((option, index) => <div key={`${option.value}-${index}`}>
              {option.group && option.group !== filtered[index - 1]?.group && <div className="admin-select-group">{option.group}</div>}
              <button id={`${id}-option-${index}`} role="option" aria-selected={option.value === selected?.value} aria-disabled={option.disabled || undefined} type="button" tabIndex={-1} disabled={option.disabled} className={index === active ? "is-highlighted" : ""} onPointerMove={event => { if (event.pointerType === "mouse" && !option.disabled) setActive(index); }} onClick={() => choose(option)}>
                <span>{option.label}</span>{option.value === selected?.value && <AdminIcon name="check"/>}
              </button>
            </div>)}
            {!filtered.length && <p className="admin-select-empty" role="status">No matching options. Try another search.</p>}
          </div>
        </dialog>, document.body,
      )}
    </span>
  );
}
