const paths = {
  menu: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  orders: <><path d="M8 4H5v17h14V4h-3"/><rect x="8" y="2" width="8" height="5" rx="2"/><path d="M8 11h8M8 15h6"/></>,
  settings: <><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  close: <path d="m6 6 12 12M6 18 18 6"/>,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6"/>,
  external: <><path d="M14 3h7v7m0-7L10 14M10 3H4v17h17v-6"/></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  edit: <><path d="m15 4 5 5M4 20l5-1L20 8a2.8 2.8 0 0 0-4-4L5 15l-1 5Z"/></>,
  trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></>,
  restore: <><path d="M3 4v6h6M3 10a9 9 0 1 1 1 9"/><path d="M12 7v5l3 2"/></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
  hidden: <><path d="m3 3 18 18M9 5.5A10 10 0 0 1 12 5c6.5 0 10 7 10 7a20 20 0 0 1-3 4M6 6.5A22 22 0 0 0 2 12s3.5 7 10 7a13 13 0 0 0 5-1"/></>,
  photo: <><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/></>,
  upload: <><path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  refresh: <><path d="M20 4v6h-6M4 20v-6h6M20 10a8 8 0 0 0-14-5M4 14a8 8 0 0 0 14 5"/></>,
  pin: <><path d="M19 10c0 5-7 12-7 12S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/></>,
  phone: <path d="m8 3 2 5-3 2c1 3 4 6 7 7l2-3 5 2v4c-9 3-20-8-17-17h4Z"/>,
  payment: <><rect x="2" y="4" width="20" height="16" rx="3"/><path d="M2 9h20M6 15h4"/></>,
  logout: <><path d="M9 3H3v18h6M10 12h11m-5-5 5 5-5 5"/></>,
};

export default function AdminIcon({ name, ...props }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.menu}</svg>;
}
