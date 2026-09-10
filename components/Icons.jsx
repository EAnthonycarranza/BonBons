// Shared SVG sprite. Injected as raw markup so the original SVG attributes
// (stroke-width, viewBox…) stay valid without converting each one to JSX.
const SPRITE = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-cakepop" viewBox="0 0 64 64"><rect x="30" y="30" width="4" height="30" rx="2" fill="#C98A4B"/><circle cx="32" cy="22" r="17" fill="currentColor"/><path d="M32 5a17 17 0 0 1 15.6 10.3C43 12 36 11 30 13c-6 2-9 6-10.6 10.8A17 17 0 0 1 32 5Z" fill="#fff" opacity=".35"/><g fill="#fff"><rect x="24" y="16" width="6" height="2.4" rx="1.2" transform="rotate(-25 27 17)"/><rect x="35" y="14" width="6" height="2.4" rx="1.2" transform="rotate(20 38 15)"/><rect x="27" y="27" width="6" height="2.4" rx="1.2" transform="rotate(35 30 28)"/></g></symbol>
  <symbol id="i-strawberry" viewBox="0 0 64 64"><path d="M32 58c-11 0-19-9-19-20 0-8 8-14 19-14s19 6 19 14c0 11-8 20-19 20Z" fill="#E8285F"/><path d="M13 34c2-6 9-10 19-10s17 4 19 10c-4 5-11 8-19 8s-15-3-19-8Z" fill="currentColor"/><path d="M32 24c-6 0-11-3-13-7 3 1 6 0 8-2 1 3 3 5 5 5s4-2 5-5c2 2 5 3 8 2-2 4-7 7-13 7Z" fill="#38A35A"/><g fill="#FFE9C7"><circle cx="26" cy="45" r="1.6"/><circle cx="34" cy="49" r="1.6"/><circle cx="40" cy="42" r="1.6"/></g></symbol>
  <symbol id="i-cookie" viewBox="0 0 64 64"><circle cx="32" cy="32" r="24" fill="currentColor"/><circle cx="32" cy="32" r="24" fill="#000" opacity=".07"/><circle cx="32" cy="32" r="20" fill="currentColor"/><g fill="#5B3218"><circle cx="24" cy="26" r="3.2"/><circle cx="39" cy="24" r="2.6"/><circle cx="34" cy="38" r="3"/><circle cx="21" cy="38" r="2.4"/></g></symbol>
  <symbol id="i-candyapple" viewBox="0 0 64 64"><rect x="30" y="4" width="4" height="16" rx="2" fill="#C98A4B"/><path d="M32 16c14 0 20 9 20 20s-9 24-20 24-20-13-20-24 6-20 20-20Z" fill="currentColor"/><path d="M22 24c3-3 7-4 10-4-4 2-7 6-8 11-1-3-2-5-2-7Z" fill="#fff" opacity=".4"/><path d="M34 16c2-4 6-6 10-6-1 5-4 8-10 8Z" fill="#38A35A"/></symbol>
  <symbol id="i-cupcake" viewBox="0 0 64 64"><path d="M18 34h28l-3.5 22a3 3 0 0 1-3 2.6H24.5a3 3 0 0 1-3-2.6L18 34Z" fill="#B0714A"/><g fill="#8C5636" opacity=".55"><rect x="23" y="34" width="3" height="24"/><rect x="31" y="34" width="3" height="24"/><rect x="39" y="34" width="3" height="24"/></g><path d="M32 6c7 0 11 5 11 10 4 1 7 5 7 9 0 5-4 9-9 9H23c-5 0-9-4-9-9 0-4 3-8 7-9 0-5 4-10 11-10Z" fill="currentColor"/><circle cx="32" cy="4" r="4" fill="#E8285F"/></symbol>
  <symbol id="i-cocoa" viewBox="0 0 64 64"><path d="M12 26h34v18a12 12 0 0 1-12 12H24a12 12 0 0 1-12-12V26Z" fill="currentColor"/><path d="M46 30h4a8 8 0 0 1 0 16h-4" fill="none" stroke="currentColor" stroke-width="5"/><ellipse cx="29" cy="26" rx="17" ry="5" fill="#F6E3C8"/><g stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8" fill="none"><path d="M24 18c-3-3 3-5 0-8"/><path d="M34 18c-3-3 3-5 0-8"/></g></symbol>
  <symbol id="i-favor" viewBox="0 0 64 64"><rect x="10" y="26" width="44" height="30" rx="4" fill="currentColor"/><rect x="6" y="18" width="52" height="12" rx="4" fill="currentColor"/><rect x="6" y="18" width="52" height="12" rx="4" fill="#000" opacity=".12"/><rect x="27" y="18" width="10" height="38" fill="#fff" opacity=".85"/><path d="M32 18c-4-10-16-10-14-2 1 4 8 4 14 2Zm0 0c4-10 16-10 14-2-1 4-8 4-14 2Z" fill="#fff" opacity=".85"/></symbol>
  <symbol id="i-krispie" viewBox="0 0 64 64"><rect x="30" y="34" width="4" height="26" rx="2" fill="#C98A4B"/><rect x="12" y="10" width="40" height="28" rx="8" fill="currentColor"/><g fill="#fff" opacity=".5"><circle cx="22" cy="20" r="3"/><circle cx="33" cy="17" r="2.6"/><circle cx="42" cy="23" r="3"/><circle cx="27" cy="30" r="2.6"/><circle cx="38" cy="32" r="2.4"/></g></symbol>
  <symbol id="i-sparkle" viewBox="0 0 24 24"><path d="M12 0c1 6.5 5.5 11 12 12-6.5 1-11 5.5-12 12-1-6.5-5.5-11-12-12C6.5 11 11 6.5 12 0Z" fill="currentColor"/></symbol>
  <symbol id="i-star" viewBox="0 0 24 24"><path d="m12 1.6 3.1 6.6 7.2 1-5.2 5.1 1.2 7.1L12 18l-6.3 3.4 1.2-7.1L1.7 9.2l7.2-1L12 1.6Z" fill="currentColor"/></symbol>
  <symbol id="i-check" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></symbol>
  <symbol id="i-bag" viewBox="0 0 24 24"><path d="M6 7h12l1 13H5L6 7Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M9 7a3 3 0 0 1 6 0" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></symbol>
  <symbol id="i-ig" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.9"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.9"/><circle cx="17.2" cy="6.8" r="1.3" fill="currentColor"/></symbol>
  <symbol id="i-fb" viewBox="0 0 24 24"><path d="M14 9V7.5c0-.9.4-1.5 1.6-1.5H17V3h-2.4C12.1 3 11 4.4 11 6.8V9H9v3h2v9h3v-9h2.3l.4-3H14Z" fill="currentColor"/></symbol>
  <symbol id="i-tt" viewBox="0 0 24 24"><path d="M16 3c.4 2.2 1.9 3.7 4 4v3c-1.6 0-3-.4-4-1.2V15a6 6 0 1 1-6-6v3a3 3 0 1 0 3 3V3h3Z" fill="currentColor"/></symbol>
</defs></svg>`;

export function IconSprite() {
  return <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: SPRITE }} />;
}

/** Renders one symbol from the sprite. `name` is a symbol id, e.g. "i-star". */
export function Icon({ name, className, style, ...rest }) {
  return (
    <svg className={className} style={style} aria-hidden="true" {...rest}>
      <use href={`#${name}`} />
    </svg>
  );
}

export function Stars({ count = 5, label = "5 out of 5 stars" }) {
  return (
    <div className="stars" role="img" aria-label={label}>
      {Array.from({ length: count }).map((_, i) => (
        <Icon key={i} name="i-star" />
      ))}
    </div>
  );
}
