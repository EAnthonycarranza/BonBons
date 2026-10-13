import test from 'node:test';
import assert from 'node:assert/strict';
import {getCartPricing,buildBundlesFromSingles,hydrateCartItems} from '../lib/pricing.js';
import {normalizeOrderItems} from '../lib/order-menu.js';
import {assertBundleSelection,canonicalBoxItems,bundleLimitType} from '../lib/bundles.js';
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
  const selection=[a,b,c,d],counts={};
  for(const item of selection){const type=bundleLimitType(item);counts[type]=(counts[type]||0)+1;}
  const valid=Object.entries(counts).every(([type,qty])=>qty<=({'rice-crispy-treats':1,'dipped-oreos':2}[type]||3));
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

test('mixed packs require another treat type, while three plus one works in either direction',()=>{
 for(const slugs of [['rod','rod','rod','pop'],['pop','pop-two','pop','rod']])assert.doesNotThrow(()=>normalizeOrderItems([pack(slugs)],MENU,PRICES));
 for(const slugs of [['rod','rod','rod','rod'],['pop','pop-two','pop','pop-two']])assert.throws(()=>normalizeOrderItems([pack(slugs)],MENU,PRICES),/at most 3.*different flavors/);
});
test('saved category types determine the limit even when customers forge type metadata',()=>{
 const menu=[...MENU,{...MENU[2],slug:'special-rod',category:'seasonal',treatType:'pretzel-rods'}];
 const bad=pack(['rod','special-rod','rod','special-rod']);
 bad.flavors=bad.flavors.map(f=>({...f,category:f.slug,treatType:f.slug,bundleEligible:true}));
 assert.throws(()=>normalizeOrderItems([bad],menu,PRICES),/at most 3/);
 assert.doesNotThrow(()=>normalizeOrderItems([pack(['rod','special-rod','rod','pop'])],menu,PRICES));
});
test('homogeneous carts never suggest mixed packs, but cake-pop pairs are still available',()=>{
 for(const cart of [[single('rod',8)],[single('pop',2),single('pop-two',2)]]){
  const pricing=getCartPricing(cart,PRICES),converted=buildBundlesFromSingles(cart,PRICES,'mixed');
  assert.equal(pricing.suggestedFourPacks,0);assert.equal(converted.packCount,0);assert.deepEqual(converted.items,cart);
 }
 assert.equal(getCartPricing([single('pop',4)],PRICES).groups.find(g=>g.key==='cakepop').suggestedPacks,2);
});
test('scarce second types are shared across packs instead of being wasted in the first pack',()=>{
 const cart=[single('pop',9),single('rice',1),single('oreo',2)];
 const converted=buildBundlesFromSingles(cart,PRICES,'mixed');
 assert.equal(converted.packCount,3);assert.equal(converted.convertedUnits,12);
 assert.equal(normalizeOrderItems(converted.items,MENU,PRICES).reduce((n,p)=>n+p.price*p.qty,0),30);
 for(const item of converted.items)assert.equal(item.flavors.find(f=>f.slug==='pop').qty,3);
});
test('packing matches independently enumerated valid combinations and preserves all units',()=>{
 const slugs=['pop','rod','rice','oreo'],limits=[3,3,1,2];
 const choices=[];
 for(let a=0;a<=3;a++)for(let b=0;b<=3;b++)for(let c=0;c<=1;c++)for(let d=0;d<=2;d++)if(a+b+c+d===4)choices.push([a,b,c,d]);
 const memo=new Map();
 const maxPacks=(counts)=>{
  const key=counts.join(',');if(memo.has(key))return memo.get(key);
  let best=0;
  for(const choice of choices)if(choice.every((qty,i)=>qty<=counts[i]))best=Math.max(best,1+maxPacks(counts.map((qty,i)=>qty-choice[i])));
  memo.set(key,best);return best;
 };
 for(let a=0;a<=5;a++)for(let b=0;b<=5;b++)for(let c=0;c<=3;c++)for(let d=0;d<=4;d++){
  const counts=[a,b,c,d],cart=slugs.map((slug,i)=>single(slug,counts[i])).filter(p=>p.qty),converted=buildBundlesFromSingles(cart,PRICES,'mixed');
  assert.equal(converted.packCount,maxPacks(counts),`inventory ${counts}`);
  const restored=Object.fromEntries(slugs.map(slug=>[slug,0]));
  for(const item of converted.items){
   if(item.flavors){
    assert.equal(item.flavors.reduce((n,f)=>n+f.qty,0),4);
    for(const flavor of item.flavors){restored[flavor.slug]+=flavor.qty*item.qty;assert.ok(flavor.qty<=limits[slugs.indexOf(flavor.slug)]);}
   }else restored[item.key]+=item.qty;
  }
  assert.deepEqual(slugs.map(slug=>restored[slug]),counts);
  if(converted.items.length)assert.doesNotThrow(()=>normalizeOrderItems(converted.items,MENU,PRICES));
 }
});
test('legacy homogeneous four-packs are flagged when reloaded and rejected at checkout',()=>{
 const invalid=['box-4-old','box-4m-test'].map(key=>({...pack(['pop','pop-two','pop','pop-two']),key}));
 for(const item of invalid){
  assert.equal(hydrateCartItems([item],MENU,PRICES)[0].invalidBundle,true);
  assert.throws(()=>normalizeOrderItems([item],MENU,PRICES),/at most 3/);
 }
});
test('new eligible treat categories use the three-per-type limit without merging unrelated types',()=>{
 const menu=['cookies','brownies'].map(category=>({slug:category,key:category,name:category,category,treatType:'other',unitCount:1,bundleEligible:true,active:true,price:3,qty:1}));
 assert.throws(()=>normalizeOrderItems([pack(['cookies','cookies','cookies','cookies'])],menu,PRICES),/at most 3/);
 assert.doesNotThrow(()=>normalizeOrderItems([pack(['cookies','cookies','cookies','brownies'])],menu,PRICES));
 assert.equal(buildBundlesFromSingles([{...menu[0],qty:3},menu[1]],PRICES,'mixed').packCount,1);
});
