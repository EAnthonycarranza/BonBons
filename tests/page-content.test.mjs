import test from "node:test";
import assert from "node:assert/strict";
import {pageDefault,validatePageContent,pageText,isPageLink,isPageImage} from "../lib/page-content.js";

test("both page defaults are valid and independent editable copies",()=>{
  for(const slug of ["home","about"]){const content=pageDefault(slug);assert.deepEqual(validatePageContent(slug,content),content);content.sections[0].fields.heading="Changed";assert.notEqual(pageDefault(slug).sections[0].fields.heading,"Changed");}
});
test("all sections can be reordered and supporting sections hidden",()=>{
  const content=pageDefault("home");content.sections.reverse();content.sections.find(s=>s.id==="gallery").enabled=false;
  const saved=validatePageContent("home",content);assert.equal(saved.sections[0].id,"newsletter");assert.equal(saved.sections.find(s=>s.id==="gallery").enabled,false);
});
test("drafts must keep a complete unique set of known sections",()=>{
  for(const change of [c=>c.sections.pop(),c=>c.sections[1]=c.sections[0],c=>c.sections[0].id="unknown",c=>c.sections[0].enabled=false,c=>c.sections[0].fields.heading=42]){const c=pageDefault("home");change(c);assert.throws(()=>validatePageContent("home",c));}
});
test("page links exclude executable, protocol-relative, and credential-bearing URLs",()=>{
  for(const href of ["/shop","/build-a-box","#our-story","https://example.com/events","mailto:info@bonbonssweets.com","tel:+17262254990"])assert.equal(isPageLink(href),true);
  for(const href of ["javascript:alert(1)","//evil.example","data:text/html,x","https://password@example.com", "http://example.com"])assert.equal(isPageLink(href),false);
  const c=pageDefault("about");c.sections[0].fields.actionHref="javascript:alert(1)";assert.throws(()=>validatePageContent("about",c),/HTTPS link/);
});
test("page photos use only known local image paths or the existing shop photo bucket",()=>{
  for(const image of ["","/images/bonnie-and-greg.jpg","/products/bonbons-real-assortment.jpg","https://slerrjoiowaskmvgykxt.supabase.co/storage/v1/object/public/menu-photos/flavors/real.webp"])assert.equal(isPageImage(image),true);
  for(const image of ["/api/admin","/images/../secret.jpg","https://untrusted.example/photo.png","data:image/png;base64,AA"])assert.equal(isPageImage(image),false);
});
test("gallery additions are validated and capped while unknown privileged fields are discarded",()=>{
  const c=pageDefault("home"),gallery=c.sections.find(s=>s.id==="gallery");gallery.items.push({...gallery.items[0]});c.published_at="fake";c.sections[0].fields.arbitrary="<script>x</script>";
  const saved=validatePageContent("home",c);assert.equal(saved.published_at,undefined);assert.equal(saved.sections[0].fields.arbitrary,undefined);assert.equal(saved.sections.find(s=>s.id==="gallery").items.length,4);
  gallery.items=Array.from({length:13},()=>gallery.items[0]);assert.throws(()=>validatePageContent("home",c),/12 items/);
});
test("price tokens follow current prices and leave ordinary prose unchanged",()=>{
  assert.equal(pageText("Treats {singlePrice}, two {pairPrice}; save {saving}",{singlePrice:"$3",pairPrice:"$5",saving:"$1"}),"Treats $3, two $5; save $1");
});
