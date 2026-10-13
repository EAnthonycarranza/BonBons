"use client";

import Image from "next/image";
import WeeklyBoxManager from "./WeeklyBoxManager";
import MenuManager from "./MenuManager";
import AdminIcon from "./AdminIcon";
import "./catalog-admin.css";

export default function AdminBoxesAndBags() {
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
            className="collection-jump-links"
            aria-label="Jump to collection"
          >
            <a href="#admin-boxes">
              <AdminIcon name="photo" />
              Boxes <span aria-hidden="true">↓</span>
            </a>
            <a href="#admin-mystery-bags">
              <AdminIcon name="coupon" />
              Mystery bags <span aria-hidden="true">↓</span>
            </a>
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
      >
        <WeeklyBoxManager embedded />
      </section>
      <section
        id="admin-mystery-bags"
        className="collection-workspace catalog-panel"
        aria-label="Mystery bags"
      >
        <MenuManager mysteryBagsOnly embedded />
      </section>
    </div>
  );
}
