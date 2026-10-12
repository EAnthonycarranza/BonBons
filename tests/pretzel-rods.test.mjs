import test from 'node:test';
import assert from 'node:assert/strict';
import {getCartPricing,buildBundlesFromSingles,hydrateCartItems} from '../lib/pricing.js';
import {normalizeOrderItems} from '../lib/order-menu.js';
import {assertBundleSelection,canonicalBoxItems} from '../lib/bundles.js';
const PRICES={singlePopPrice:3,treatPairPrice:5,fourPackPrice:10};
const MENU=[['pop','everyday'],['pop-two','custom'],['rod','pretzel-rods'],['rice','rice-crispy-treats'],['rice-two','rice-crispy-treats'],['oreo','dipped-oreos'],['oreo-two','dipped-oreos']].map(([slug,category])=>({slug,name:slug,category,price:3,active:true,stockQuantity:null}));
const single=(slug,qty=1)=>({...MENU.find(p=>p.slug===slug),key:slug,qty});
function pack(slugs,group='mixed',qty=1){return {key:group==='mixed'?'box-4m-test':'box-2c-test',qty,price:0.01,flavors:[...new Set(slugs)].map(slug=>({slug,qty:slugs.filter(s=>s===slug).length}))};}
test('cake-pop pairs cost $5 and reject every other product category',()=>{
 for(const a of ['pop','pop-two'])for(const b of ['pop','pop-two'])assert.equal(normalizeOrderItems([pack([a,b],'cakepop')],MENU,PRICES)[0].price,5);
 for(const slug of ['rod','rice','oreo'])assert.throws(()=>normalizeOrderItems([pack(['pop',slug],'cakepop')],MENU,PRICES),/cake pops only/);
});
test('all four-piece combinations follow category limits across different flavors',()=>{
 for(const a of MENU)for(const b of MENU)for(const c of MENU)for(const d of MENU){
  const selection=[a,b,c,d],valid=selection.filter(p=>p.category==='rice-crispy-treats').length<=1&&selection.filter(p=>p.category==='dipped-oreos').length<=2;
  const order=pack(selection.map(p=>p.slug));
  if(valid)assert.equal(normalizeOrderItems([order],MENU,PRICES)[0].price,10);
  else assert.throws(()=>normalizeOrderItems([order],MENU,PRICES),/at most/);
 }
});
test('limits apply to each pack rather than the whole order',()=>{
 const [line]=normalizeOrderItems([pack(['rice','oreo','oreo-two','pop'],'mixed',3)],MENU,PRICES);
 assert.equal(line.qty,3);assert.equal(getCartPricing([line],PRICES).subtotal,30);
});
test('forged browser categories and prices cannot bypass limits or current prices',()=>{
 const bad=pack(['rice','rice-two','pop','rod']);bad.flavors=bad.flavors.map(f=>({...f,category:'everyday'}));
 assert.throws(()=>normalizeOrderItems([bad],MENU,PRICES),/at most 1/);
 assert.equal(normalizeOrderItems([pack(['pop','rod','oreo','rice'])],MENU,{...PRICES,fourPackPrice:11})[0].price,11);
});
test('mixed requests validate piece counts, duplicate slots and unavailable flavors',()=>{
 for(const flavors of [undefined,[],[{slug:'pop',qty:3}],[{slug:'missing',qty:4}],[{slug:'pop',qty:2},{slug:'pop',qty:2}]])assert.throws(()=>normalizeOrderItems([{key:'box-4m-test',qty:1,flavors}],MENU,PRICES));
 assert.throws(()=>normalizeOrderItems([pack(['pop','rod','rice','oreo'])],MENU.map(p=>({...p,active:false})),PRICES));
});
test('stock is aggregated across packs and singles',()=>{
 const menu=MENU.map(p=>p.slug==='rice'?{...p,stockQuantity:2}:p);
 assert.throws(()=>normalizeOrderItems([pack(['rice','pop','rod','oreo'],'mixed',2),{key:'rice',qty:1}],menu,PRICES),/Only 2/);
});
test('cart conversion packs restricted categories together without exceeding their limits',()=>{
 const cart=[single('rice',3),single('rice-two',2),single('oreo',6),single('pop',7)];
 const converted=buildBundlesFromSingles(cart,PRICES,'mixed');
 assert.equal(converted.packCount,4);
 const normalized=normalizeOrderItems(converted.items,MENU,PRICES);
 assert.equal(getCartPricing(normalized,PRICES).subtotal,46);
 for(const item of converted.items.filter(p=>p.flavors))assertBundleSelection('mixed',item.flavors.map(f=>({...f,category:MENU.find(p=>p.slug===f.slug).category})));
 assert.equal(cart.reduce((n,p)=>n+p.qty,0),18);
});
test('restricted-only leftovers stay as singles and never create an invalid pack',()=>{
 for(const slug of ['rice','oreo']){
  const cart=[single(slug,8)],converted=buildBundlesFromSingles(cart,PRICES,'mixed');
  assert.equal(converted.packCount,0);assert.equal(getCartPricing(cart,PRICES).potentialSavings,0);
 }
});
test('cake-pop conversion leaves other products alone and overlapping savings are not added',()=>{
 const cart=[single('pop',4),single('rod',1)];
 const converted=buildBundlesFromSingles(cart,PRICES,'cakepop');assert.equal(converted.packCount,2);
 assert.equal(converted.items.find(p=>p.key==='rod').qty,1);
 assert.equal(getCartPricing([single('pop',4)],PRICES).bundleSavings,2);
});
test('old carts are refreshed from current menu categories and obsolete mixed pairs are flagged',()=>{
 const old=[{key:'rice',qty:2,category:'everyday',price:0.1},pack(['rice','pop'],'cakepop'),{...pack(['pop','rod','rice','oreo']),key:'box-4-old'}];
 const hydrated=hydrateCartItems(old,MENU,PRICES);
 assert.equal(hydrated[0].category,'rice-crispy-treats');assert.equal(hydrated[0].price,3);
 assert.equal(hydrated[1].invalidBundle,true);assert.equal(hydrated[2].invalidBundle,false);assert.equal(hydrated[2].price,10);
 assert.throws(()=>normalizeOrderItems([{...pack(['rod','rod'],'cakepop'),key:'box-2p-old'}],MENU,PRICES),/no longer an offer/);
});
test('the separately priced weekly box accepts all saved treat types',()=>{
 assert.doesNotThrow(()=>canonicalBoxItems([{slug:'pop'}],MENU));
 for(const slug of ['rice','oreo','rod'])assert.doesNotThrow(()=>canonicalBoxItems([{slug}],MENU));
 assert.throws(()=>canonicalBoxItems([{slug:'missing'}],MENU),/no longer on the menu/);
});
