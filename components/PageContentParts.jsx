import Link from "next/link";
import { pageText } from "@/lib/page-content";

export function PageHeading({ fields, values = {}, level = 2 }) {
  const Tag = `h${level}`;
  return <Tag>{pageText(fields.heading, values)}{fields.highlight && <><br/><em>{pageText(fields.highlight, values)}</em></>}</Tag>;
}
export function PageParagraphs({ text, values = {} }) {
  return pageText(text, values).split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index} style={{ whiteSpace: "pre-line" }}>{paragraph}</p>);
}
export function PageLink({ href, label, className = "text-link", arrow = "↗" }) {
  if (!href || !label) return null;
  return <Link className={className} href={href}>{label} <span aria-hidden="true">{arrow}</span></Link>;
}
