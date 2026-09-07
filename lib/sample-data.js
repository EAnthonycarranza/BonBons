import { STYLED_PRODUCT_PHOTOS } from "./product-photos.js";

/**
 * Starter menu for an unconfigured local preview only. Supabase is the source
 * of truth in production, including visibility, photos, and an empty menu.
 */

export const SAMPLE_PRODUCTS = [
  ["cookie-monster", "Cookie Monster"],
  ["strawberry-shortcake", "Strawberry Shortcake"],
  ["biscoff", "Biscoff"],
].map(([slug, name], index) => ({
  slug, name, blurb: "A single handmade cake pop",
  description: `${name} cake pops, made by Bon Bon’s. Choose a single or include this flavor in a four-pack. Ask Bonnie about ingredients and current availability.`,
  price: 4, unit: "each", active: true, bundleEligible: true, image: STYLED_PRODUCT_PHOTOS[slug] || "", icon: "i-cakepop",
  color: "#F285B5", tint: "242,133,181", badge: "", badgeClass: "", category: "everyday", allergens: [], sortOrder: (index + 1) * 10,
}));

export const BOX_SIZES = [
  { id:"four-pack", label:"Four Pack", pieces:4, price:10 },
];

export const OCCASIONS = [
  { slug:"weddings-showers", title:"Weddings & Showers", short:"Elegant cake pop favors finished in your palette.",
    gradient:"linear-gradient(140deg,#FF2E9A,#A55CFF)",
    intro:"Turn your florals, invitation, or wedding palette into hand-finished cake pops that feel like part of the day.",
    bullets:["Palette-matched coatings and drizzle","Monogram, metallic, and floral details","Individually wrapped favor options","Flavor mixes for every guest list"] },
  { slug:"birthdays", title:"Birthdays & Quinces", short:"Colorful cake pop sets built around the theme.",
    gradient:"linear-gradient(140deg,#FFB020,#FF6A3D)",
    intro:"From a first birthday to a quinceañera, we match the theme and make enough cake pops for the full guest list.",
    bullets:["Any theme and color direction","Six cake flavors to mix and match","Personalized favor wrapping","Arranged pickup by appointment"] },
  { slug:"corporate", title:"Corporate & Gifting", short:"Brand-color cake pops for clients, teams, and launches.",
    gradient:"linear-gradient(140deg,#3B9BFF,#1B4FD0)",
    intro:"Send us your logo and brand colors. We create polished cake pop sets for client gifting, team moments, or a launch event.",
    bullets:["Brand-color finishing","Individually wrapped for handout","Custom cards and box notes","Larger quantities available by request"] },
  { slug:"baby-showers", title:"Baby Showers", short:"Soft palettes and sweet cake pop favors for every guest.",
    gradient:"linear-gradient(140deg,#5FE0B6,#3B9BFF)",
    intro:"Soft colors, small-batch flavor mixes, and a finish that looks considered in every photo.",
    bullets:["Pastel and neutral palettes","Sprinkle and drizzle combinations","Individually wrapped favors","Flavor cards for the display"] },
];

export const FAQS = [
  { q:"How much are the cake pops?",
    a:"Individual cake pops are $4 each at any quantity. Four-packs are a separate $10 option. If you add four or more singles, the cart will suggest switching full groups of four to packs, but it will never change them unless you choose to." },
  { q:"How far ahead do I need to order?",
    a:"Send your pickup request at least 72 hours ahead when possible. Custom colors and larger event orders may need 2–3 weeks. If you need them sooner, ask—the owner will let you know what is available." },
  { q:"Can you match my party colors exactly?",
    a:"Yes. Send a photo of your invitation, a color swatch or a hex code and we match chocolate, icing and ribbon to it. Deep shades like navy and black are possible but add a little cost." },
  { q:"Do you deliver, or is it pickup only?",
    a:"Orders are pickup only for now. After you send a request, the owner will contact you to confirm the pickup date, time, and location." },
  { q:"What about allergies?",
    a:"Tell us at order time and we'll flag it. Our kitchen handles nuts, dairy, eggs, wheat and soy, so we can't guarantee an allergen-free environment, but we can avoid specific ingredients and label everything clearly for your guests." },
  { q:"How do payment and deposits work?",
    a:"Bonnie confirms your order and final total first. Then use the Payment options link to open Bon Bon’s dot.cards profile and choose Venmo, Cash App, or Zelle. Payment is handled outside this website. Include your order number and wait for confirmation before paying." },
  { q:"What if I need to change or cancel?",
    a:"Contact the owner as soon as possible. Changes depend on how close the pickup date is and whether ingredients or custom materials have already been purchased." },
];

export const SITE = {
  name: "Bon Bon's Sweets & More",
  tagline: "Cake Pops for Any Kind of Day",
  phone: "(210) 721-3983",
  phoneHref: "tel:+12107213983",
  email: "bonbonssweets.sa@gmail.com",
  paymentUrl: "https://dot.cards/bonbonssweetssa?utm_source=nfc&e=ZGV2aWNlLXhQTnBTNUwyUmVoLXcyLXBr",
  paymentInstructions: "After Bonnie confirms your order and final total, open Bon Bon’s payment options on dot.cards. Choose Venmo, Cash App, or Zelle and include your order number. Please confirm payment with Bonnie directly.",
  facebook: "https://www.facebook.com/bonbonssweets.sa",
  facebookHandle: "bonbonssweets.sa",
  facebookLive: "https://www.facebook.com/bonbonssweets.sa/live_videos/",
  instagram: "https://www.instagram.com/bonbonssweets.satx/",
  instagramEmbed: "https://www.instagram.com/bonbonssweets.satx/embed",
  instagramHandle: "@bonbonssweets.satx",
  instagramLive: "https://www.instagram.com/bonbonssweets.satx/live/",
  tiktok: "https://www.tiktok.com/@bonbonssweetssa",
  tiktokLive: "https://www.tiktok.com/@bonbonssweetssa/live",
  tiktokHandle: "@bonbonssweetssa",
  hours: "Pickup Tue–Sat, by appointment",
};
