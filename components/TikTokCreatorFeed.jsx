"use client";

import Script from "next/script";
import { useRef } from "react";

export default function TikTokCreatorFeed({ handle, profileUrl }) {
  const embedRef = useRef(null);
  const refreshEmbed = () => {
    const node = embedRef.current;
    const lib = window.tiktokEmbed?.lib;
    // TikTok's loader normally scans new, unmarked blockquotes. Next caches
    // that script across routes, so give render the new nodes on a return visit.
    // Calling render without an array throws and leaves the profile unmounted.
    if (node && !node.id && lib?.render) {
      Promise.resolve(lib.render([node])).catch(() => {
        // Keep the profile link usable if the third-party embed is blocked.
      });
    }
  };

  return (
    <div className="tiktok-creator-embed">
      <blockquote
        ref={embedRef}
        className="tiktok-embed"
        cite={profileUrl}
        data-unique-id={handle.replace("@", "")}
        data-embed-from="oembed"
        data-embed-type="creator"
        style={{ maxWidth: 780, minWidth: 288, margin: "0 auto" }}
      >
        <section>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`${profileUrl}?refer=creator_embed`}
          >
            {handle}
          </a>
        </section>
      </blockquote>
      <Script
        id="tiktok-creator-embed-script"
        src="https://www.tiktok.com/embed.js"
        strategy="lazyOnload"
        onLoad={refreshEmbed}
        onReady={refreshEmbed}
      />
    </div>
  );
}
