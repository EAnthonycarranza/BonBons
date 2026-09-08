"use client";
import { useRef, useState } from "react";
import AdminIcon from "./AdminIcon";
import ConfirmDialog from "./ConfirmDialog";
import { money } from "@/lib/format";
import { ORDER_EXPORT_COLUMNS, ordersToRows, parseOrderRows } from "@/lib/order-import";

const ACCEPT = ".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const MAX_FILE_BYTES = 5 * 1024 * 1024;

/**
 * Spreadsheet import and export for pickup orders.
 *
 * SheetJS is loaded on demand rather than in the page bundle, because most
 * visits to the order desk never touch a spreadsheet.
 */
async function sheetjs() {
  const mod = await import("xlsx");
  return mod.default ?? mod;
}

function timestamp() {
  return new Date().toISOString().slice(0, 10);
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function OrderDataTools({ orders, onImported }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState(null);

  const rows = () => [ORDER_EXPORT_COLUMNS, ...ordersToRows(orders, { money })];

  async function exportFile(kind) {
    setBusy(kind); setError(""); setNotice("");
    try {
      if (!orders.length) throw new Error("There are no orders to export yet.");
      const XLSX = await sheetjs();
      const sheet = XLSX.utils.aoa_to_sheet(rows());
      sheet["!cols"] = ORDER_EXPORT_COLUMNS.map((heading) => ({ wch: Math.max(12, heading.length + 2) }));
      if (kind === "csv") {
        const csv = XLSX.utils.sheet_to_csv(sheet);
        // The BOM keeps Excel from mangling accents in customer names.
        download(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }), `bonbons-orders-${timestamp()}.csv`);
      } else {
        const book = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(book, sheet, "Pickup orders");
        const buffer = XLSX.write(book, { bookType: "xlsx", type: "array" });
        download(
          new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
          `bonbons-orders-${timestamp()}.xlsx`
        );
      }
      setNotice(`Exported ${orders.length} ${orders.length === 1 ? "order" : "orders"}.`);
    } catch (err) { setError(err.message); }
    finally { setBusy(""); }
  }

  async function pickFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(""); setNotice(""); setBusy("parse");
    try {
      if (file.size > MAX_FILE_BYTES) throw new Error("Choose a file under 5 MB.");
      const XLSX = await sheetjs();
      const book = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const first = book.SheetNames[0];
      if (!first) throw new Error("That file has no sheets in it.");
      // Keep blank rows: dropping them here would renumber every later row, and
      // the error messages must point at the line the owner sees in Excel.
      const sheetRows = XLSX.utils.sheet_to_json(book.Sheets[first], { header: 1, blankrows: true, defval: "", raw: true });
      const parsed = parseOrderRows(sheetRows);
      if (!parsed.orders.length) {
        throw new Error(parsed.errors[0]?.message || "No orders could be read from that file.");
      }
      setPreview({ ...parsed, filename: file.name });
    } catch (err) { setError(err.message); }
    finally { setBusy(""); }
  }

  async function confirmImport() {
    if (!preview) return;
    setBusy("import"); setError("");
    try {
      const response = await fetch("/api/admin/orders/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders: preview.orders }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The import could not be completed.");
      setPreview(null);
      setNotice(`Imported ${data.imported} ${data.imported === 1 ? "order" : "orders"}.`);
      await onImported?.();
    } catch (err) { setError(err.message); }
    finally { setBusy(""); }
  }

  async function downloadTemplate() {
    setBusy("template"); setError("");
    try {
      const XLSX = await sheetjs();
      const example = [
        ORDER_EXPORT_COLUMNS,
        ["", "pending", "not_arranged", "Jane Doe", "jane@example.com", "(210) 555-0111",
         "2026-10-01", "", "", "", "Cookie Monster x4", "12.00", "", "Birthday pickup", "", ""],
      ];
      const sheet = XLSX.utils.aoa_to_sheet(example);
      sheet["!cols"] = ORDER_EXPORT_COLUMNS.map((h) => ({ wch: Math.max(12, h.length + 2) }));
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, "Import template");
      const buffer = XLSX.write(book, { bookType: "xlsx", type: "array" });
      download(
        new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        "bonbons-import-template.xlsx"
      );
    } catch (err) { setError(err.message); }
    finally { setBusy(""); }
  }

  return (
    <section className="order-tools">
      <div className="order-tools-head">
        <div>
          <span className="admin-kicker">Spreadsheets</span>
          <p>Download your orders, or bring in past ones from a file.</p>
        </div>
        <div className="order-tools-actions">
          <button type="button" className="admin-btn admin-btn-secondary" onClick={() => exportFile("xlsx")} disabled={Boolean(busy)}>
            <AdminIcon name="upload" />{busy === "xlsx" ? "Preparing…" : "Export Excel"}
          </button>
          <button type="button" className="admin-btn admin-btn-secondary" onClick={() => exportFile("csv")} disabled={Boolean(busy)}>
            <AdminIcon name="upload" />{busy === "csv" ? "Preparing…" : "Export CSV"}
          </button>
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => fileRef.current?.click()} disabled={Boolean(busy)}>
            <AdminIcon name="plus" />{busy === "parse" ? "Reading…" : "Import file"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            onChange={pickFile}
            hidden
            aria-label="Choose a CSV or Excel file of orders"
          />
        </div>
      </div>
      <p className="order-tools-note">
        Excel (.xlsx, .xls) and CSV are both accepted. The file needs
        <b> Customer</b>, <b> Email</b> and <b> Wanted date</b> columns; everything else is
        optional. <button type="button" className="admin-text-btn" onClick={downloadTemplate} disabled={Boolean(busy)}>
          Download a template
        </button>
      </p>

      {notice ? <p className="admin-alert" role="status">{notice}<button type="button" onClick={() => setNotice("")} aria-label="Dismiss"><AdminIcon name="close" /></button></p> : null}
      {error ? <p className="admin-alert is-error" role="alert">{error}</p> : null}

      <ConfirmDialog
        open={Boolean(preview)}
        title={`Import ${preview?.orders.length ?? 0} ${preview?.orders.length === 1 ? "order" : "orders"}?`}
        message={
          preview
            ? `Read from ${preview.filename}.` +
              (preview.skipped ? ` ${preview.skipped} blank ${preview.skipped === 1 ? "row was" : "rows were"} skipped.` : "") +
              (preview.errors.length ? ` ${preview.errors.length} ${preview.errors.length === 1 ? "row" : "rows"} could not be read and will not be imported.` : "")
            : ""
        }
        consequence={
          preview?.errors.length
            ? preview.errors.slice(0, 3).map((problem) => problem.message).join(" ")
            : "These are added as new orders. No emails are sent to the customers."
        }
        confirmLabel="Import these orders"
        cancelLabel="Cancel"
        busy={busy === "import"}
        onConfirm={confirmImport}
        onCancel={() => setPreview(null)}
      />
    </section>
  );
}
