import { isMenuImageUrl } from "../supabase/functions/_shared/menu.js";
import { MIXED_PACK_RULE } from "./bundles.js";

const section = (id, label, fields, items) => ({ id, label, enabled: true, fields, ...(items ? { items } : {}) });
export const PAGE_DEFAULTS = {
  home: {
    title: "Handmade treats in San Antonio",
    description: `Cake pops, pretzel rods, dipped rice crispy treats, and dipped Oreos, handmade by Bon Bon's. Cake pops {singlePrice} each or 2 for {pairPrice}. Mix four treats for {mixedPrice}. ${MIXED_PACK_RULE}`,
    sections: [
      section("hero", "First impression", {
        eyebrow: "Handmade treats · San Antonio", heading: "A little sweetness.", highlight: "A lot of joy.",
        body: "Cake pops, pretzel rods, dipped rice crispy treats, and dipped Oreos. Handmade treats for your afternoon craving, someone you love, or a celebration worth sharing.",
        primaryLabel: "Shop all treats", primaryHref: "/shop", secondaryLabel: "Mix & match four", secondaryHref: "/build-a-box",
        image: "/products/bonbons-assortment-styled.webp", imageAlt: "Styled assortment of Bon Bon's wrapped cake pops on a marble platter",
        caption: "From Bonnie’s kitchen.", captionNote: "Something sweet for everyone.", stampLabel: "Mix your favorites", singleNote: "for one cake pop", pairNote: "for two cake pops",
      }),
      section("notes", "Shop highlights", {}, [{ text: "Handmade & hand-dipped" }, { text: "Cake pops, crispy treats, pretzels & Oreos" }, { text: "San Antonio pickup only" }]),
      section("weekly", "Box of the Week", { eyebrow: "The weekly edit", note: "Handpicked by Bon Bon’s", overline: "Look who’s joining the box", heading: "Your week.", highlight: "A little sweeter.", body: "Meet the {boxTitle}: {popCount} handmade treats, {flavorCount} varieties, and a little something to look forward to.", actionLabel: "Discover the Box of the Week", soldOutLabel: "See this week’s box", pickupNote: "Limited batch · San Antonio pickup only" }),
      section("collection", "Menu favorites", { featuredProducts: "", eyebrow: "The treat collection", heading: "Meet your new", highlight: "favorite.", actionLabel: "Explore the full menu", actionHref: "/shop", note: `Cake pops are {singlePrice} each or 2 for {pairPrice}. Mix four treats for {mixedPrice}. ${MIXED_PACK_RULE}` }),
      section("banner", "Wide photo", { image: "/products/bonbons-flavors-banner.webp", imageAlt: "Styled Cookie Monster and Strawberry Shortcake cake pops", href: "/shop" }),
      section("pair", "Mix & match offer", { eyebrow: "A little variety goes a long way", heading: "Four treats.", highlight: "Your kind of mix.", body: `Cake pops, pretzel rods, dipped rice crispy treats, and dipped Oreos. Mix four favorites for {mixedPrice}. ${MIXED_PACK_RULE}`, image: "/products/bonbons-real-assortment.jpg", imageAlt: "An assortment of Bonnie's handmade cake pops", priceNote: "four mixed treats", savingNote: "save {saving} compared with four {singlePrice} singles", actionLabel: "Make it your own", actionHref: "/build-a-box", note: `Prefer cake pops? Choose two for {pairPrice}. ${MIXED_PACK_RULE}` }),
      section("maker", "Meet the makers", { eyebrow: "From Bonnie’s kitchen", heading: "Made with love.", highlight: "Rooted in faith.", body: "What began as Bonnie’s love of baking for family and friends became a way to share her God-given gifts. With her husband Greg cheering her on, that love is at the heart of every handmade treat.", image: "/images/bonnie-and-greg.jpg", imageAlt: "Bonnie and her husband Greg together", caption: "Bonnie & Greg · The heart behind Bon Bon’s", actionLabel: "Meet the people behind the treats", actionHref: "/about" }),
      section("gallery", "Kitchen gallery", { eyebrow: "Our handmade treats", heading: "Straight from", highlight: "our kitchen.", body: "The finishing touches, the boxes ready to go, and a few sweet moments from Bon Bon’s.", note: "Photos show past batches and packaging, and include styled images based on Bon Bon’s own. Visit the menu for current products and availability." }, [
        { image: "/products/bonbons-variety-styled.webp", imageAlt: "Styled assortment of individually wrapped cake pops", caption: "A little of everything", note: "Hand-finished, one treat at a time" },
        { image: "/products/bonbons-real-gift-box.jpg", imageAlt: "Bon Bon's wrapped cake pops in a gift box", caption: "Packed with care", note: "A peek at a past bakery box" },
        { image: "/products/bonbons-colorful-pops-styled.webp", imageAlt: "Styled colorful cake pops with decorated toppings", caption: "Every batch has personality", note: "Colors, crumbs, and all the little details" },
      ]),
      section("pickup", "How pickup works", { eyebrow: "From our kitchen to your hands", heading: "A sweet little", highlight: "pickup.", body: "Pickup only. Pay after confirmation. A personal touch from start to finish." }, [
        { heading: "Pick your treats", body: `Choose {singlePrice} cake pops, two cake pops for {pairPrice}, or a mixed four-pack for {mixedPrice}. ${MIXED_PACK_RULE}` },
        { heading: "Send your request", body: "Tell us your preferred date and any notes. Bonnie will confirm the details with you." },
        { heading: "Swing by & enjoy", body: "Once confirmed, use our payment options link. Pick up at the agreed time and location." },
      ]),
      section("social", "Social updates", { eyebrow: "Fresh from social", heading: "A peek behind", highlight: "the treats.", body: "Kitchen moments, fresh designs, and a little fun along the way. Catch up with Bonnie on your favorite channel.", tiktokSummary: "Behind the scenes, giveaways, and live broadcasts", instagramSummary: "Finished sets, color ideas, photos, and reels", facebookSummary: "Community updates, videos, and recent Page posts", tiktokEyebrow: "Come behind the scenes", tiktokHeading: "See what’s cooking on TikTok.", tiktokBody: "Watch the latest videos, join live giveaways, and get a closer look at how every sweet detail comes together.", tiktokLiveNote: "TikTok opens the livestream when the account is live and the profile when it isn’t.", disclosure: "Live availability is controlled by each platform. Instagram may ask viewers to sign in." }),
      section("newsletter", "Event email signup", { eyebrow: "Something sweet is coming", heading: "Handmade treats today.", highlight: "More to love tomorrow.", body: "Find out where Bon Bon’s will be next. Sign up for updates about our local events." }),
    ],
  },
  about: {
    title: "Our story",
    description: "Meet Bonnie Gazmez and her supporting husband Greg Gamez. Bon Bon's handmade treats are rooted in family, love, and Christian faith.",
    sections: [
      section("hero", "Meet Bonnie & Greg", { eyebrow: "The heart behind Bon Bon’s", heading: "A little faith.", highlight: "A lot of heart.", body: "Meet Bonnie Gazmez—the baker, believer, and creator behind Bon Bon’s Sweets & More.\n\nA lifelong love of baking, the encouragement of her husband Greg Gamez, and a God-given gift. That is where our story begins.", actionLabel: "Come into our kitchen", actionHref: "#our-story", image: "/images/bonnie-and-greg.jpg", imageAlt: "Bonnie and her supporting husband Greg Gamez", caption: "Bonnie & Greg", captionNote: "Family. Faith. Something sweet." }),
      section("beginnings", "How it started", { eyebrow: "01 / How it started", heading: "Always baking.", highlight: "Always sharing.", body: "For Bonnie, baking has always been about the people she loves. Long before Bon Bon’s, she was making sweet treats for her family and friends—finding joy in something homemade and the smiles that followed.\n\nOne day, she decided to turn those God-given gifts into a handmade treat business. Bon Bon’s Sweets & More grew from that simple step: sharing what she loves with a few more people." }),
      section("faith", "What guides her", { eyebrow: "02 / What guides her", heading: "Faith is not just part of the story.", highlight: "It is at the heart of it.", body: "Bonnie’s Christian faith is a big part of who she is. She sees her creativity and love for baking as gifts from God, and Bon Bon’s is a way to put those gifts to work with gratitude, care, and love for others." }),
      section("family", "Better together", { eyebrow: "03 / Better together", heading: "A dream with", highlight: "Greg by her side.", body: "Behind Bonnie is her supporting husband, Greg Gamez. His encouragement is an important part of her journey, and together they bring the warmth of family to Bon Bon’s.\n\nToday, our menu includes cake pops, pretzel rods, dipped rice crispy treats, and dipped Oreos. A little treat for yourself, two to share, or something special for a celebration—each begins with that same love of making someone’s day.", image: "/products/bonbons-real-gift-box.jpg", imageAlt: "Bonnie's wrapped cake pops in a gift box with blue paper filling", actionLabel: "Find a little joy of your own", actionHref: "/shop" }),
      section("closing", "Closing invitation", { eyebrow: "From our family to you", heading: "Thanks for being part", highlight: "of our sweet beginning.", primaryLabel: "Shop all treats", primaryHref: "/shop", secondaryLabel: "Planning an event? Rent the cart", secondaryHref: "/rent-a-cart" }),
    ],
  },
};

export function pageDefault(slug) {
  return PAGE_DEFAULTS[slug] ? structuredClone(PAGE_DEFAULTS[slug]) : null;
}
export function pageText(value, values = {}) {
  return String(value || "").replace(/\{([a-zA-Z]+)\}/g, (match, key) => values[key] === undefined ? match : String(values[key]));
}
export function isPageImage(value) {
  return isMenuImageUrl(value) || /^\/(?:products|images)\/[a-z0-9-]+\.(?:png|jpe?g|webp)$/.test(value);
}
export function isPageLink(value) {
  if (!value) return true;
  if (/^(?:\/(?!\/)[a-zA-Z0-9/_?#=&%.-]*|#[a-zA-Z0-9_-]+)$/.test(value)) return true;
  if (/^tel:\+?[0-9-]+$/.test(value) || /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return true;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
}

export function validatePageContent(slug, input) {
  const template = PAGE_DEFAULTS[slug];
  if (!template || !input || typeof input !== "object" || Array.isArray(input)) throw new Error("Choose Home or About and enter the page content.");
  if (JSON.stringify(input).length > 180000) throw new Error("This page is too large. Shorten the content before saving.");
  function field(key, value) {
    if (typeof value !== "string" || value.length > (key === "body" ? 10000 : 2000)) throw new Error(`Enter valid text for ${key}.`);
    if (key === "image" && !isPageImage(value)) throw new Error("Choose a website photo or upload a JPG, PNG, or WebP image.");
    if ((key === "href" || key.endsWith("Href")) && !isPageLink(value)) throw new Error("Use a website path, HTTPS link, email address, or phone link.");
    return value.trim();
  }
  const clean = { title: field("title", input.title), description: field("description", input.description), sections: [] };
  if (!clean.title) throw new Error("Enter the page title.");
  if (!Array.isArray(input.sections) || input.sections.length !== template.sections.length) throw new Error("The page sections are incomplete. Refresh the editor.");
  const seen = new Set();
  for (const value of input.sections) {
    const base = template.sections.find(item => item.id === value?.id);
    if (!base || seen.has(value.id) || typeof value.enabled !== "boolean") throw new Error("Each page section must appear once with its visibility selected.");
    seen.add(value.id);
    const fields = Object.fromEntries(Object.keys(base.fields).map(key => [key, field(key, value.fields?.[key])]));
    const entry = { id: base.id, label: base.label, enabled: value.enabled, fields };
    if (base.items) {
      if (!Array.isArray(value.items) || value.items.length > 12) throw new Error("A page section can contain up to 12 items.");
      entry.items = value.items.map(item => Object.fromEntries(Object.keys(base.items[0]).map(key => [key, field(key, item?.[key])])));
    }
    clean.sections.push(entry);
  }
  if (!clean.sections.find(item => item.id === "hero")?.enabled) throw new Error("Keep the page introduction visible so visitors can identify the page.");
  return clean;
}
