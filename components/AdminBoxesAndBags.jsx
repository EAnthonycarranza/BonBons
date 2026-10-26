"use client";

import Image from "next/image";
import { useState } from "react";
import WeeklyBoxManager from "./WeeklyBoxManager";
import MenuManager from "./MenuManager";
import AdminIcon from "./AdminIcon";
import "./catalog-admin.css";

export default function AdminBoxesAndBags() {
  const [collection, setCollection] = useState("boxes");
  return (
    <div className="admin-view boxes-and-bags">
      <header className="admin-page-head boxes-and-bags-head">
        <div>
          <span className="admin-kicker">Treat collections</span>
          <h1>Boxes &amp; mystery bags.</h1>
          <p>
            Manage your weekly boxes, mystery boxes, and mystery bags together.
            Set the contents, price, and stock for each collection below.
          </p>
          <nav
            className="collection-switcher"
            aria-label="Choose a collection"
          >
            <button type="button" aria-pressed={collection === "boxes"} onClick={() => setCollection("boxes")} aria-controls="admin-boxes">
              <AdminIcon name="photo" />
              <span><b>Boxes</b><small>Weekly &amp; mystery boxes</small></span>
            </button>
            <button type="button" aria-pressed={collection === "bags"} onClick={() => setCollection("bags")} aria-controls="admin-mystery-bags">
              <AdminIcon name="coupon" />
              <span><b>Mystery bags</b><small>Surprises, price &amp; stock</small></span>
            </button>
          </nav>
        </div>
        <Image
          src="/products/mystery-bags-flyer.jpg"
          alt="Bon Bon's mystery four-pack bag flyer"
          width={960}
          height={1280}
        />
      </header>
      <section
        id="admin-boxes"
        className="collection-workspace catalog-panel"
        aria-label="Weekly and mystery boxes"
        hidden={collection !== "boxes"}
      >
        <WeeklyBoxManager embedded />
      </section>
      <section
        id="admin-mystery-bags"
        className="collection-workspace catalog-panel"
        aria-label="Mystery bags"
        hidden={collection !== "bags"}
      >
        <MenuManager mysteryBagsOnly embedded />
      </section>
    </div>
  );
}
