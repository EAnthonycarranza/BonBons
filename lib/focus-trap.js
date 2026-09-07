// Keep keyboard navigation inside an open mobile menu or request drawer.
export function trapFocus(container, event) {
  if (event.key !== "Tab" || !container) return;
  const controls = [...container.querySelectorAll('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')]
    .filter((element) => !element.matches(':disabled, [tabindex="-1"]') && !element.closest('[inert], [hidden], [aria-hidden="true"]') && element.getClientRects().length);
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (!first) return;
  if (!container.contains(document.activeElement) || (event.shiftKey && document.activeElement === first)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
