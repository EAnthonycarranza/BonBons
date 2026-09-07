"use client";

import { useState } from "react";
import { Icon } from "./Icons";
import TikTokCreatorFeed from "./TikTokCreatorFeed";
import { SITE } from "@/lib/sample-data";

const facebookPluginUrl = new URL("https://www.facebook.com/plugins/page.php");
facebookPluginUrl.searchParams.set("href", SITE.facebook);
facebookPluginUrl.searchParams.set("tabs", "timeline");
facebookPluginUrl.searchParams.set("width", "500");
facebookPluginUrl.searchParams.set("height", "680");
facebookPluginUrl.searchParams.set("small_header", "true");
facebookPluginUrl.searchParams.set("adapt_container_width", "true");
facebookPluginUrl.searchParams.set("hide_cover", "false");
facebookPluginUrl.searchParams.set("show_facepile", "false");

function AccordionSummary({
  id,
  panelId,
  icon,
  tone,
  platform,
  handle,
  description,
  isOpen,
  onToggle,
}) {
  return (
    <button
      className="social-accordion-summary"
      id={id}
      type="button"
      aria-expanded={isOpen}
      aria-controls={panelId}
      onClick={onToggle}
    >
      <span className={`social-accordion-icon social-accordion-icon-${tone}`}>
        <Icon name={icon} />
      </span>
      <span className="social-accordion-title">
        <span>{platform}</span>
        <b>{handle}</b>
        <small>{description}</small>
      </span>
      <span className="social-accordion-toggle" aria-hidden="true" />
    </button>
  );
}

function AccordionPanel({ id, labelledBy, isOpen, children }) {
  return (
    <div
      className="social-accordion-content"
      id={id}
      role="region"
      aria-labelledby={labelledBy}
      aria-hidden={!isOpen}
      inert={!isOpen}
    >
      <div className="social-accordion-content-inner">{children}</div>
    </div>
  );
}

function PlatformActions({ platform, profileUrl, liveUrl }) {
  return (
    <div className="social-accordion-actions">
      <a
        className="btn btn-ghost"
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open {platform} ↗
      </a>
      <a
        className="btn social-live-button"
        href={liveUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="live-dot" aria-hidden="true" /> Check live
      </a>
    </div>
  );
}

export default function SocialFeedAccordion() {
  const [openPlatform, setOpenPlatform] = useState("tiktok");

  const togglePlatform = (platform) => {
    setOpenPlatform((current) => (current === platform ? null : platform));
  };

  return (
    <div className="social-hub rv-anim" id="social">
      <div className="social-hub-heading">
        <div>
          <div className="eyebrow">Fresh from social</div>
          <h2>
            A peek behind <em>the pops.</em>
          </h2>
        </div>
        <p>
          Kitchen moments, fresh designs, and a little fun along the way. Catch
          up with Bonnie on your favorite channel.
        </p>
      </div>

      <div className="social-accordion">
        <section
          className={`social-accordion-item social-accordion-tiktok${openPlatform === "tiktok" ? " is-open" : ""}`}
          id="tiktok"
        >
          <AccordionSummary
            id="social-tiktok-trigger"
            panelId="social-tiktok-panel"
            icon="i-tt"
            tone="tiktok"
            platform="TikTok"
            handle={SITE.tiktokHandle}
            description="Behind the scenes, giveaways, and live broadcasts"
            isOpen={openPlatform === "tiktok"}
            onToggle={() => togglePlatform("tiktok")}
          />
          <AccordionPanel
            id="social-tiktok-panel"
            labelledBy="social-tiktok-trigger"
            isOpen={openPlatform === "tiktok"}
          >
            <div className="social-accordion-panel">
              <div className="tiktok-showcase">
                <div className="tiktok-intro">
                  <div className="tiktok-icon">
                    <Icon name="i-tt" />
                  </div>
                  <div className="eyebrow">Come behind the scenes</div>
                  <h2>See what&apos;s popping on TikTok.</h2>
                  <p>
                    Watch the latest videos, join live giveaways, and get a
                    closer look at how every sweet detail comes together.
                  </p>
                  <div className="tiktok-actions">
                    <a
                      className="btn btn-pink"
                      href={SITE.tiktok}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Follow {SITE.tiktokHandle}
                    </a>
                    <a
                      className="btn btn-ghost"
                      href={SITE.tiktokLive}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="live-dot" aria-hidden="true" /> Check
                      live now
                    </a>
                  </div>
                  <p className="tiktok-live-note">
                    TikTok opens the livestream when the account is live and the
                    profile when it isn&apos;t.
                  </p>
                </div>
                <div className="tiktok-feed-shell">
                  <div className="tiktok-feed-top">
                    <span>Latest from {SITE.tiktokHandle}</span>
                    <a
                      href={SITE.tiktok}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open TikTok ↗
                    </a>
                  </div>
                  <TikTokCreatorFeed
                    handle={SITE.tiktokHandle}
                    profileUrl={SITE.tiktok}
                  />
                </div>
              </div>
            </div>
          </AccordionPanel>
        </section>

        <section
          className={`social-accordion-item social-accordion-instagram${openPlatform === "instagram" ? " is-open" : ""}`}
          id="instagram-feed"
        >
          <AccordionSummary
            id="social-instagram-trigger"
            panelId="social-instagram-panel"
            icon="i-ig"
            tone="instagram"
            platform="Instagram"
            handle={SITE.instagramHandle}
            description="Finished sets, color ideas, photos, and reels"
            isOpen={openPlatform === "instagram"}
            onToggle={() => togglePlatform("instagram")}
          />
          <AccordionPanel
            id="social-instagram-panel"
            labelledBy="social-instagram-trigger"
            isOpen={openPlatform === "instagram"}
          >
            <div className="social-accordion-panel">
              <PlatformActions
                platform="Instagram"
                profileUrl={SITE.instagram}
                liveUrl={SITE.instagramLive}
              />
              <div className="social-feed-embed social-feed-embed-instagram">
                <iframe
                  title={`${SITE.name} Instagram posts`}
                  src={SITE.instagramEmbed}
                  width="100%"
                  height="590"
                  loading="lazy"
                  scrolling="no"
                  frameBorder="0"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </AccordionPanel>
        </section>

        <section
          className={`social-accordion-item social-accordion-facebook${openPlatform === "facebook" ? " is-open" : ""}`}
          id="facebook-feed"
        >
          <AccordionSummary
            id="social-facebook-trigger"
            panelId="social-facebook-panel"
            icon="i-fb"
            tone="facebook"
            platform="Facebook"
            handle={SITE.facebookHandle}
            description="Community updates, videos, and recent Page posts"
            isOpen={openPlatform === "facebook"}
            onToggle={() => togglePlatform("facebook")}
          />
          <AccordionPanel
            id="social-facebook-panel"
            labelledBy="social-facebook-trigger"
            isOpen={openPlatform === "facebook"}
          >
            <div className="social-accordion-panel">
              <PlatformActions
                platform="Facebook"
                profileUrl={SITE.facebook}
                liveUrl={SITE.facebookLive}
              />
              <div className="social-feed-embed social-feed-embed-facebook">
                <iframe
                  title={`${SITE.name} Facebook timeline`}
                  src={facebookPluginUrl.toString()}
                  width="500"
                  height="680"
                  loading="lazy"
                  scrolling="no"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          </AccordionPanel>
        </section>
      </div>

      <p className="social-live-disclosure">
        <span className="live-dot" aria-hidden="true" />
        Live availability is controlled by each platform. Instagram may ask
        viewers to sign in.
      </p>
    </div>
  );
}
