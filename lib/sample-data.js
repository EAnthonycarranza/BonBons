/**
 * Sample content used when MONGODB_URI is not configured, and as the seed
 * source for `npm run seed`. Replace the prices, copy and ZIP codes with the
 * real ones — everything here is placeholder.
 */

export const SAMPLE_PRODUCTS = [
  { slug:"dipped-strawberries", name:"Dipped Strawberries", blurb:"Dozen · tuxedo & drizzle",
    description:"Fresh strawberries hand-dipped in Belgian chocolate and finished with drizzle, tuxedo or your party colors. Made the day before your event so they arrive at their best.",
    price:34, unit:"/ dozen", icon:"i-strawberry", color:"#FF5FA8", tint:"255,46,154",
    badge:"Best seller", badgeClass:"hot", category:"treats", allergens:["dairy","soy"], sortOrder:1 },
  { slug:"cake-pops", name:"Cake Pops", blurb:"Dozen · your palette",
    description:"Moist cake rolled, dipped and decorated to match your palette down to the sprinkle. Choose vanilla, chocolate or funfetti.",
    price:28, unit:"/ dozen", icon:"i-cakepop", color:"#B87CFF", tint:"165,92,255",
    badge:"Custom color", badgeClass:"", category:"treats", allergens:["dairy","eggs","wheat"], sortOrder:2 },
  { slug:"custom-cookies", name:"Custom Cookies", blurb:"Dozen · names & logos",
    description:"Hand-iced sugar cookies with names, monograms, logos or full themed sets. Send us artwork and we match it.",
    price:42, unit:"/ dozen", icon:"i-cookie", color:"#D9A35F", tint:"255,211,78",
    badge:"Personalized", badgeClass:"", category:"treats", allergens:["dairy","eggs","wheat"], sortOrder:3 },
  { slug:"candy-apples", name:"Candy Apples", blurb:"Six · glossy & crunchy",
    description:"Classic mirror-glossy candy apples, or gourmet coats with caramel, nuts and drizzle.",
    price:30, unit:"/ six", icon:"i-candyapple", color:"#E8285F", tint:"232,40,95",
    badge:"", badgeClass:"", category:"treats", allergens:["nuts"], sortOrder:4 },
  { slug:"cupcakes", name:"Cupcakes", blurb:"Dozen · six flavors",
    description:"Buttercream-finished cupcakes in six rotating flavors. Standard or mini.",
    price:26, unit:"/ dozen", icon:"i-cupcake", color:"#FF7FB5", tint:"255,127,181",
    badge:"", badgeClass:"", category:"treats", allergens:["dairy","eggs","wheat"], sortOrder:5 },
  { slug:"cocoa-bombs", name:"Cocoa Bombs", blurb:"Set of 6 · gift wrapped",
    description:"Chocolate spheres filled with cocoa and marshmallows, wrapped and ribboned. Seasonal flavors in winter.",
    price:22, unit:"/ set", icon:"i-cocoa", color:"#A7714E", tint:"167,113,78",
    badge:"Seasonal", badgeClass:"", category:"gifts", allergens:["dairy","soy"], sortOrder:6 },
  { slug:"krispie-pops", name:"Rice Krispie Pops", blurb:"Dozen · dipped & sprinkled",
    description:"Chewy krispie treats on a stick, dipped and sprinkled to match your theme. A favorite with kids.",
    price:24, unit:"/ dozen", icon:"i-krispie", color:"#5FE0B6", tint:"63,217,164",
    badge:"New", badgeClass:"new", category:"treats", allergens:["dairy"], sortOrder:7 },
  { slug:"party-favors", name:"Party Favor Boxes", blurb:"Personalized per guest",
    description:"Small boxes with a personalized tag and a treat inside — one per place setting. Minimum 20.",
    price:3.5, unit:"each", icon:"i-favor", color:"#6FB6FF", tint:"59,155,255",
    badge:"Bulk", badgeClass:"", category:"favors", allergens:[], sortOrder:8 },
];

export const BOX_SIZES = [
  { id:"small",  label:"Small",  pieces:12, price:38 },
  { id:"medium", label:"Medium", pieces:24, price:68 },
  { id:"large",  label:"Large",  pieces:36, price:95 },
];

export const BOX_TREATS = [
  { id:"t-straw",  name:"Dipped Strawberries", note:"chocolate & drizzle", icon:"i-strawberry", color:"#E8285F" },
  { id:"t-pops",   name:"Cake Pops",           note:"any color",           icon:"i-cakepop",    color:"#A55CFF" },
  { id:"t-cookie", name:"Iced Cookies",        note:"names & shapes",      icon:"i-cookie",     color:"#C98A4B" },
  { id:"t-krisp",  name:"Krispie Pops",        note:"dipped & sprinkled",  icon:"i-krispie",    color:"#3FD9A4" },
  { id:"t-cup",    name:"Mini Cupcakes",       note:"six flavors",         icon:"i-cupcake",    color:"#FF2E9A" },
  { id:"t-cocoa",  name:"Cocoa Bombs",         note:"seasonal",            icon:"i-cocoa",      color:"#8C5636" },
];

export const OCCASIONS = [
  { slug:"weddings-showers", title:"Weddings & Showers", short:"Monogrammed cookies, dipped strawberries and styled displays.",
    gradient:"linear-gradient(140deg,#FF2E9A,#A55CFF)",
    intro:"The dessert table is where your guests gather, linger and take photographs. We build it around your palette and your florals so it belongs to the room.",
    bullets:["Monogram and crest cookies","Tuxedo and drizzle strawberries","Tiered stands, linens and signage","On-site setup and same-night teardown"] },
  { slug:"birthdays", title:"Birthdays & Quinces", short:"Themed boxes, favors and enough for the grown-ups.",
    gradient:"linear-gradient(140deg,#FFB020,#FF6A3D)",
    intro:"From a first birthday to a quinceañera, we match the theme exactly and scale it to your headcount without anyone running out.",
    bullets:["Any theme, any color","Smash-cake and mini sets","Personalized favors per guest","Delivery or arranged pickup"] },
  { slug:"corporate", title:"Corporate & Gifting", short:"Logo cookies, client gifting and event catering.",
    gradient:"linear-gradient(140deg,#3B9BFF,#1B4FD0)",
    intro:"Send us your logo and brand colors. We produce consistent, individually wrapped treats suitable for client gifting or a launch event.",
    bullets:["Logo-printed and hand-iced cookies","Individually wrapped for handout","Invoicing and PO numbers accepted","Bulk pricing from 100 units"] },
  { slug:"baby-showers", title:"Baby Showers", short:"Soft palettes, tiny favors and a table that photographs well.",
    gradient:"linear-gradient(140deg,#5FE0B6,#3B9BFF)",
    intro:"Gentle colors, small portions and a display that looks considered in every photo. Gender-reveal centers available.",
    bullets:["Pastel and neutral palettes","Mini portions for grazing","Gender-reveal centers","Keepsake favor boxes"] },
];

export const FAQS = [
  { q:"How far ahead do I need to order?",
    a:"Ready-made boxes need 72 hours. Custom orders and dessert tables are best booked 2–3 weeks out, and popular weekends fill earlier. If your date is sooner, ask anyway — we keep some rush capacity." },
  { q:"Can you match my party colors exactly?",
    a:"Yes. Send a photo of your invitation, a color swatch or a hex code and we match chocolate, icing and ribbon to it. Deep shades like navy and black are possible but add a little cost." },
  { q:"Do you deliver, or is it pickup only?",
    a:"Both. Pickup is by arranged appointment, Tuesday through Saturday. Local delivery is available and free on orders over $75 — use the ZIP checker on the home page to confirm your area." },
  { q:"What about allergies?",
    a:"Tell us at order time and we'll flag it. Our kitchen handles nuts, dairy, eggs, wheat and soy, so we can't guarantee an allergen-free environment, but we can avoid specific ingredients and label everything clearly for your guests." },
  { q:"How do payment and deposits work?",
    a:"Ready-made boxes are paid in full at checkout. Custom orders and dessert tables take a 50% deposit to lock the date, with the balance due at pickup or delivery." },
  { q:"What if I need to change or cancel?",
    a:"Changes are free up to 7 days before your date. Inside 7 days we'll do what we can, but ingredients may already be ordered. Deposits are refundable up to 14 days out." },
];

/** PLACEHOLDER service area — replace with the real ZIP codes before launch. */
export const DELIVERY_ZIPS = ["78201","78209","78212","78216","78230","78240","78248","78258","78260"];

export const SITE = {
  name: "Bon Bon's Sweets & More",
  tagline: "Making Every Celebration Sweeter",
  phone: "(555) 010-2288",
  phoneHref: "tel:5550102288",
  email: "hello@bonbons.com",
  hours: "Pickup Tue–Sat, by appointment",
  freeDeliveryOver: 75,
};
