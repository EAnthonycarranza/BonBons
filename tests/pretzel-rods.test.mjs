import test from "node:test";
import assert from "node:assert/strict";
import { getCartPricing, buildBundlesFromSingles } from "../lib/pricing.js";
import { normalizeOrderItems } from "../lib/order-menu.js";
import { bundleGroupForCategory,bundlePrices,assertBoxItemsAreCakePops } from "../lib/bundles.js";

const PRICES={singlePopPrice:3,treatPairPrice:5};
const MENU=[
  {slug:"pop",name:"Cake Pop",category:"everyday",price:3,active:true,bundleEligible:true,stockQuantity:null},
  {slug:"rod",name:"Pretzel Rod",category:"pretzel-rods",price:3,active:true,bundleEligible:true,stockQuantity:3},
  {slug:"rice",name:"Rice Crispy Treat",category:"rice-crispy-treats",price:3,active:true,bundleEligible:true,stockQuantity:2},
  {slug:"oreo",name:"Dipped Oreo",category:"dipped-oreos",price:3,active:true,bundleEligible:true,stockQuantity:null},
  {slug:"special",name:"Specialty Cake Pop",category:"everyday",price:4,active:true,bundleEligible:true,stockQuantity:null},
];
const single=(slug,qty=1)=>({key:slug,name:MENU.find(p=>p.slug===slug).name,price:MENU.find(p=>p.slug===slug).price,qty,bundleEligible:MENU.find(p=>p.slug===slug).bundleEligible,bundleGroup:bundleGroupForCategory(MENU.find(p=>p.slug===slug).category)});
const pair=(a,b,qty=1)=>({key:"box-2t-mixed",qty,price:0.01,flavors:a===b?[{slug:a,qty:2}]:[{slug:a,qty:1},{slug:b,qty:1}]});

test("all regular categories share the two-treat offer",()=>{
  for(const p of MENU)assert.equal(bundleGroupForCategory(p.category),"treat");
  assert.deepEqual(bundlePrices("treat",{}),{single:3,pack:5});
});
test("customers can mix every combination of regular product types",()=>{
  for(const a of MENU.filter(p=>p.bundleEligible))for(const b of MENU.filter(p=>p.bundleEligible)){
    const [item]=normalizeOrderItems([pair(a.slug,b.slug)],MENU,PRICES);
    assert.equal(item.price,5);assert.equal(item.name,"Mix & Match Two-Treat Pack (2 pc)");
    assert.equal(item.flavors.reduce((n,p)=>n+p.qty,0),2);
  }
});
test("loose singles stay as selected until an explicit conversion",()=>{
  const cart=[single("pop"),single("rod"),single("special")];
  assert.equal(getCartPricing(cart,PRICES).subtotal,10);
  assert.equal(getCartPricing(cart,PRICES).potentialSavings,1);
  const converted=buildBundlesFromSingles(cart,PRICES);
  assert.equal(converted.packCount,1);assert.equal(cart.length,3);
  assert.equal(converted.items.find(item=>item.key==="special").price,4);
  assert.equal(getCartPricing(normalizeOrderItems(converted.items,MENU,PRICES),PRICES).subtotal,9);
});
test("odd quantities keep the leftover regular treat as a single",()=>{
  const converted=buildBundlesFromSingles([single("oreo",3)],PRICES);
  assert.equal(converted.packCount,1);
  assert.equal(converted.items.find(item=>item.key==="oreo").qty,1);
  assert.equal(getCartPricing(converted.items,PRICES).subtotal,8);
});
test("every flavor can join the offer while individual prices come from the live menu",()=>{
  const [mix]=normalizeOrderItems([pair("special","pop")],MENU,PRICES);
  assert.equal(mix.price,5);
  const [item]=normalizeOrderItems([{key:"special",qty:2,price:3,bundleEligible:true}],MENU,PRICES);
  assert.equal(item.price,4);assert.equal(item.bundleEligible,true);
  assert.equal(getCartPricing([item],PRICES).potentialSavings,3);
});
test("pair quantity, unique slots, and availability are enforced",()=>{
  const variants=[undefined,[],[{slug:"pop",qty:3}],[{slug:"missing",qty:2}],[{slug:"pop",qty:1},{slug:"pop",qty:1}]];
  for(const flavors of variants)assert.throws(()=>normalizeOrderItems([{key:"box-2t-invalid",qty:1,flavors}],MENU,PRICES));
  assert.throws(()=>normalizeOrderItems([pair("rice","rice",2)],MENU,PRICES),/Only 2/);
});
test("stock checks combine singles and packs across the whole request",()=>{
  assert.throws(()=>normalizeOrderItems([{key:"rice",qty:2},pair("rice","pop")],MENU,PRICES),/Only 2/);
  assert.throws(()=>normalizeOrderItems([pair("rice","pop"),pair("rice","oreo"),{key:"rice",qty:1}],MENU,PRICES),/Only 2/);
});
test("the retired four-pack cannot be submitted from a stale saved cart",()=>{
  assert.throws(()=>normalizeOrderItems([{key:"box-4-old",qty:1,flavors:[{slug:"pop",qty:4}]}],MENU,PRICES),/replaced by the two-treat offer/);
});
test("old pretzel pair cart keys now use the current shared offer",()=>{
  const [item]=normalizeOrderItems([{...pair("rod","pop"),key:"box-2p-old"}],MENU,{...PRICES,treatPairPrice:5.5});
  assert.equal(item.price,5.5);
});
test("saved cake-pop and pretzel singles can be combined in one offer",()=>{
  const old=[{...single("pop"),bundleGroup:"cakepop"},{...single("rod"),bundleGroup:"pretzel"}];
  assert.equal(buildBundlesFromSingles(old,PRICES).packCount,1);
});
test("the separately priced weekly box stays a curated cake-pop box",()=>{
  assert.doesNotThrow(()=>assertBoxItemsAreCakePops([{slug:"pop"}],MENU));
  for(const slug of ["rod","rice","oreo"])assert.throws(()=>assertBoxItemsAreCakePops([{slug}],MENU),/cake pops only/);
});
