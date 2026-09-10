"use client";
import { useCallback, useEffect, useState } from "react";
import AdminIcon from "./AdminIcon";
import { money } from "@/lib/format";
import { assertPrice, MenuValidationError } from "@/supabase/functions/_shared/menu";

/**
 * One screen for every price in the shop: the four-pack, the headline single
 * price used in site copy, and each flavor's own price.
 *
 * Flavor rows save one at a time so a typo in one price cannot block the rest,
 * and each row reports its own result.
 */
export default function PricingManager() {
  const [products, setProducts] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [settings, setSettings] = useState({ singlePopPrice: "", fourPackPrice: "", pretzelRodPrice: "", pretzelPairPrice: "" });
  const [loading, setLoading] = useState(true);
  const [savingShop, setSavingShop] = useState(false);
  const [savingRow, setSavingRow] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const [menuRes, settingsRes] = await Promise.allSettled([
      fetch("/api/admin/menu", { cache: "no-store" }),
      fetch("/api/admin/shop-settings", { cache: "no-store" }),
    ]);
    if (menuRes.status === "fulfilled" && menuRes.value.ok) {
      const data = await menuRes.value.json().catch(() => ({}));
      const live = (data.products || []).filter((product) => !product.deletedAt);
      setProducts(live);
      setDrafts(Object.fromEntries(live.map((product) => [product.id, String(product.price)])));
    } else {
      setError("Could not load the cake-pop menu.");
    }
    if (settingsRes.status === "fulfilled" && settingsRes.value.ok) {
      const data = await settingsRes.value.json().catch(() => ({}));
      if (data.settings) {
        setSettings({
          singlePopPrice: String(data.settings.singlePopPrice),
          fourPackPrice: String(data.settings.fourPackPrice),
          pretzelRodPrice: String(data.settings.pretzelRodPrice),
          pretzelPairPrice: String(data.settings.pretzelPairPrice),
        });
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveShopPrices(event) {
    event.preventDefault();
    setSavingShop(true); setError(""); setNotice("");
    try {
      // Fail before the request rather than after, with the same wording the
      // server would use.
      assertPrice(Number(settings.singlePopPrice), "The single cake-pop price");
      assertPrice(Number(settings.fourPackPrice), "The four-pack price");
      assertPrice(Number(settings.pretzelRodPrice), "The pretzel-rod price");
      assertPrice(Number(settings.pretzelPairPrice), "The two-pretzel-rod price");
      const response = await fetch("/api/admin/shop-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          singlePopPrice: Number(settings.singlePopPrice),
          fourPackPrice: Number(settings.fourPackPrice),
          pretzelRodPrice: Number(settings.pretzelRodPrice),
          pretzelPairPrice: Number(settings.pretzelPairPrice),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save these prices.");
      setNotice("Shop prices updated.");
    } catch (err) {
      setError(err instanceof MenuValidationError ? err.message : err.message);
    } finally { setSavingShop(false); }
  }

  async function saveFlavor(product) {
    const next = Number(drafts[product.id]);
    setSavingRow(product.id); setError(""); setNotice("");
    try {
      assertPrice(next, `${product.name}'s price`);
      const response = await fetch(`/api/admin/menu/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: product.name, slug: product.slug, price: next, unit: "each",
          blurb: product.blurb, description: product.description, image: product.image,
          active: product.active, bundle_eligible: product.bundleEligible,
          allergens: product.allergens, badge: product.badge,
          sort_order: product.sortOrder, source_url: product.sourceUrl,
          stock_quantity: product.stockQuantity, low_stock_threshold: product.lowStockThreshold,
          expectedUpdatedAt: product.updatedAt,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save this price.");
      setProducts((current) => current.map((entry) => entry.id === product.id ? data.product : entry));
      setNotice(`${product.name} is now ${money(data.product.price)}.`);
    } catch (err) { setError(err.message); }
    finally { setSavingRow(""); }
  }

  const changed = (product) => String(drafts[product.id] ?? "") !== String(product.price);

  return (
    <section className="admin-setting-card pricing-card">
      <header>
        <span className="summary-icon"><AdminIcon name="payment" /></span>
        <div>
          <h2>Prices</h2>
          <p>What each cake pop and pretzel rod costs, and both bundle prices.</p>
        </div>
      </header>

      {notice ? <p className="admin-alert" role="status">{notice}<button type="button" onClick={() => setNotice("")} aria-label="Dismiss"><AdminIcon name="close" /></button></p> : null}
      {error ? <p className="admin-alert is-error" role="alert">{error}</p> : null}

      <form className="pricing-shop" onSubmit={saveShopPrices}>
        <label className="admin-field">
          Single cake pop
          <input type="number" min="0.01" max="500" step="0.01" value={settings.singlePopPrice}
            onChange={(e) => setSettings((c) => ({ ...c, singlePopPrice: e.target.value }))} />
          <small>The headline price shown across the website.</small>
        </label>
        <label className="admin-field">
          Four-pack
          <input type="number" min="0.01" max="500" step="0.01" value={settings.fourPackPrice}
            onChange={(e) => setSettings((c) => ({ ...c, fourPackPrice: e.target.value }))} />
          <small>What any four selected flavors cost together.</small>
        </label>
        <label className="admin-field">
          Single pretzel rod
          <input type="number" min="0.01" max="500" step="0.01" value={settings.pretzelRodPrice}
            onChange={(e) => setSettings((c) => ({ ...c, pretzelRodPrice: e.target.value }))} />
          <small>The headline price on the pretzel-rod shelf.</small>
        </label>
        <label className="admin-field">
          Two pretzel rods
          <input type="number" min="0.01" max="500" step="0.01" value={settings.pretzelPairPrice}
            onChange={(e) => setSettings((c) => ({ ...c, pretzelPairPrice: e.target.value }))} />
          <small>What any two rods cost together.</small>
        </label>
        <button type="submit" className="admin-btn admin-btn-primary" disabled={savingShop || loading}>
          {savingShop ? "Saving…" : "Save these prices"}
        </button>
      </form>

      <h3 className="pricing-subhead">Every flavor and rod</h3>
      <p className="admin-footnote pricing-intro">
        Set a different price for any individual flavor. Most stay at the single
        cake-pop price above.
      </p>

      {loading ? (
        <p className="admin-footnote">Loading flavors…</p>
      ) : products.length === 0 ? (
        <p className="admin-footnote">No flavors on the menu yet.</p>
      ) : (
        <ul className="pricing-rows">
          {products.map((product) => (
            <li key={product.id} className={product.active ? "" : "is-hidden"}>
              <div className="pricing-name">
                <b>{product.name}</b>
                {!product.active ? <span className="menu-status">Hidden</span> : null}
              </div>
              <div className="pricing-input">
                <span aria-hidden="true">$</span>
                <input
                  type="number" min="0.01" max="500" step="0.01"
                  aria-label={`${product.name} price`}
                  value={drafts[product.id] ?? ""}
                  onChange={(e) => setDrafts((c) => ({ ...c, [product.id]: e.target.value }))}
                />
              </div>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => saveFlavor(product)}
                disabled={savingRow === product.id || !changed(product)}
              >
                {savingRow === product.id ? "Saving…" : "Save"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
