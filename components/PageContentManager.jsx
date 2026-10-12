"use client";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import AdminIcon from "./AdminIcon";
import { PAGE_DEFAULTS, isPageImage, validatePageContent } from "@/lib/page-content";
import { CATEGORY_LABELS } from "@/lib/bundles";
import { MENU_IMAGE_MAX_BYTES } from "@/supabase/functions/_shared/menu";
import "./page-editor.css";

const labelFor=key=>({body:"Text / paragraphs",heading:"Heading",highlight:"Italic heading line",eyebrow:"Small heading",image:"Photo",imageAlt:"Photo description (accessibility)",href:"Link destination",featuredProducts:"Featured product links (slugs, separated by commas)",primaryHref:"Main button destination",primaryLabel:"Main button text",secondaryHref:"Second link destination",secondaryLabel:"Second link text",actionHref:"Button destination",actionLabel:"Button text",captionNote:"Caption detail"}[key]||key.replace(/([A-Z])/g," $1").replace(/^./,letter=>letter.toUpperCase()));

function ContentField({name,value,onChange,disabled,onBusy,onError,products=[]}) {
  const [uploading,setUploading]=useState(false);
  async function upload(event) {
    const file=event.target.files?.[0];event.target.value="";if(!file)return;
    if(file.size>MENU_IMAGE_MAX_BYTES || !["image/jpeg","image/png","image/webp"].includes(file.type)){onError("Choose a JPG, PNG, or WebP photo under 5 MB.");return;}
    setUploading(true);onBusy(true);
    try{const body=new FormData();body.append("photo",file);const res=await fetch("/api/admin/menu/photo",{method:"POST",body});const data=await res.json();if(!res.ok)throw new Error(data.error||"Could not upload the photo.");onChange(data.url);}catch(error){onError(error.message);}finally{setUploading(false);onBusy(false);}
  }
  if(name === "featuredProducts") {
    const selected=value.split(",").map(slug=>slug.trim()).filter(Boolean);
    return <div className="page-editor-featured"><h3>Featured products</h3><p className="admin-footnote">Choose up to four products, or leave blank to show a favorite from each available treat category. Hidden products appear once published on the menu.</p><div>{products.map(product=><label key={product.slug}><input type="checkbox" checked={selected.includes(product.slug)} disabled={disabled || (!selected.includes(product.slug) && selected.length>=4)} onChange={event=>onChange((event.target.checked?[...selected,product.slug]:selected.filter(slug=>slug!==product.slug)).join(","))}/><span>{product.name}<small>{CATEGORY_LABELS[product.category]}</small></span></label>)}</div></div>;
  }
  if(name==="image")return <div className="page-editor-image"><span>{labelFor(name)}</span>{value && isPageImage(value) && <div className="page-editor-photo"><Image src={value} alt="Selected website photo" fill sizes="220px"/></div>}<label className="admin-btn admin-btn-secondary">{uploading?"Uploading…":"Upload / change photo"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled||uploading} onChange={upload} aria-label="Upload website photo"/></label><label className="admin-field">Existing website photo path<input value={value} disabled={disabled||uploading} onChange={event=>onChange(event.target.value)} placeholder="/products/photo.jpg"/></label>{value && <button className="admin-text-btn" type="button" disabled={disabled||uploading} onClick={()=>onChange("")}>Remove photo</button>}</div>;
  const multi=name==="body"||name.endsWith("Note")||name==="description"||name==="disclosure";
  return <label className={`admin-field${multi?" page-editor-wide":""}`}>{labelFor(name)}{multi?<textarea value={value} rows={name==="body"?5:3} maxLength={name==="body"?10000:2000} disabled={disabled} onChange={event=>onChange(event.target.value)}/>:<input value={value} maxLength={2000} disabled={disabled} onChange={event=>onChange(event.target.value)}/>}</label>;
}

export default function PageContentManager() {
  const [products,setProducts]=useState([]),[pages,setPages]=useState({}),[drafts,setDrafts]=useState({}),[slug,setSlug]=useState("home"),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[uploading,setUploading]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const load=useCallback(async()=>{
    setLoading(true);setError("");
    try {const [response,menuResponse]=await Promise.all([fetch("/api/admin/pages",{cache:"no-store"}),fetch("/api/admin/menu",{cache:"no-store"})]);const data=await response.json();const menu=await menuResponse.json();if(menuResponse.ok)setProducts((menu.products||[]).filter(product=>!product.deletedAt));if(!response.ok)throw new Error(data.error||"Could not load the pages.");const entries=Object.fromEntries(data.pages.map(page=>[page.slug,page]));setPages(entries);setDrafts(Object.fromEntries(data.pages.map(page=>[page.slug,structuredClone(page.draft_content)])));}catch(error){setError(error.message);}finally{setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);
  const content=drafts[slug],record=pages[slug];
  const dirty=Object.entries(drafts).some(([key,draft])=>JSON.stringify(draft)!==JSON.stringify(pages[key]?.draft_content));
  const currentDirty=content && JSON.stringify(content)!==JSON.stringify(record?.draft_content);
  useEffect(()=>{if(!dirty)return;const warn=event=>{event.preventDefault();event.returnValue="";};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);},[dirty]);
  function change(updater){setDrafts(current=>({...current,[slug]:updater(current[slug])}));setNotice("");}
  function field(index,key,value){change(current=>({...current,sections:current.sections.map((section,i)=>i===index?{...section,fields:{...section.fields,[key]:value}}:section)}));}
  function itemField(sectionIndex,index,key,value){change(current=>({...current,sections:current.sections.map((section,i)=>i===sectionIndex?{...section,items:section.items.map((item,j)=>j===index?{...item,[key]:value}:item)}:section)}));}
  function move(index,delta){change(current=>{const sections=[...current.sections];[sections[index],sections[index+delta]]=[sections[index+delta],sections[index]];return {...current,sections};});}
  async function save(action) {
    if(busy||uploading)return;setError("");setNotice("");
    try{validatePageContent(slug,content);}catch(error){setError(error.message);return;}
    setBusy(true);
    try{const response=await fetch("/api/admin/pages",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({slug,action,revision:record.revision,content})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Could not save the page.");setPages(current=>({...current,[slug]:data.page}));setDrafts(current=>({...current,[slug]:structuredClone(data.page.draft_content)}));setNotice(action==="publish"?`${slug==="home"?"Home":"About"} is published on the website.`:"Draft saved. Preview it before publishing.");}catch(error){setError(error.message);}finally{setBusy(false);}
  }
  const pendingPublish=record&&JSON.stringify(content)!==JSON.stringify(record.published_content);
  return <div className="admin-view page-editor"><header className="admin-page-head"><div><span className="admin-kicker">Website pages</span><h1>Your words. Your website.</h1><p>Edit every Home and About section, photos, buttons, and page details. Save a draft or publish when ready.</p></div></header>
    <div className="page-editor-toolbar"><div className="menu-tabs" role="group" aria-label="Choose a page">{["home","about"].map(key=><button type="button" key={key} aria-pressed={slug===key} className={slug===key?"active":""} onClick={()=>{setSlug(key);setError("");setNotice("");}} disabled={busy||uploading}>{key==="home"?"Home":"About"}{drafts[key]&&JSON.stringify(drafts[key])!==JSON.stringify(pages[key]?.draft_content)?" •":""}</button>)}</div><a className="admin-text-btn" href={slug==="home"?"/":"/about"} target="_blank" rel="noopener noreferrer">View live page <AdminIcon name="external"/></a></div>
    {notice&&<p className="admin-alert" role="status">{notice}</p>}{error&&<p className="admin-alert is-error" role="alert">{error}</p>}
    {loading?<p role="status">Loading website pages…</p>:!content?<button className="admin-btn admin-btn-secondary" onClick={load}>Try loading again</button>:<>
      <section className="page-editor-metadata"><h2>Page details</h2><div className="page-editor-fields"><ContentField name="title" value={content.title} disabled={busy||uploading} onChange={title=>change(current=>({...current,title}))}/><ContentField name="description" value={content.description} disabled={busy||uploading} onChange={description=>change(current=>({...current,description}))}/></div><p className="admin-footnote">Use {'{singlePrice}'} and {'{pairPrice}'} in your text to show the current shop prices. {'{mixedPrice}'} shows the four-pack price. {'{saving}'} shows the four-pack savings.</p></section>
      <div className="page-editor-sections">{content.sections.map((section,index)=><details key={section.id} className="page-editor-section" open={index===0}><summary><span><small>{String(index+1).padStart(2,"0")}</small>{section.label}</span><span className={`menu-status${section.enabled?" is-live":""}`}>{section.enabled?"Visible":"Hidden"}</span></summary><div className="page-editor-section-body"><div className="page-editor-section-actions"><label><input type="checkbox" checked={section.enabled} disabled={section.id==="hero"||busy||uploading} onChange={event=>change(current=>({...current,sections:current.sections.map((entry,i)=>i===index?{...entry,enabled:event.target.checked}:entry)}))}/>Show this section{section.id==="hero"?" (page introduction)":""}</label><div><button className="admin-btn admin-btn-secondary" type="button" aria-label={`Move ${section.label} up`} disabled={index===0||busy||uploading} onClick={()=>move(index,-1)}>↑</button><button className="admin-btn admin-btn-secondary" type="button" aria-label={`Move ${section.label} down`} disabled={index===content.sections.length-1||busy||uploading} onClick={()=>move(index,1)}>↓</button></div></div><div className="page-editor-fields">{Object.entries(section.fields).map(([key,value])=><ContentField key={key} name={key} value={value} disabled={busy||uploading} onChange={value=>field(index,key,value)} onBusy={setUploading} onError={setError} products={products}/>)}</div>
      {section.items && <div className="page-editor-items">{section.items.map((item,itemIndex)=><div className="page-editor-item" key={itemIndex}><header><h3>Item {itemIndex+1}</h3><button className="admin-text-btn" type="button" disabled={busy||uploading} onClick={()=>change(current=>({...current,sections:current.sections.map((entry,i)=>i===index?{...entry,items:entry.items.filter((_,j)=>j!==itemIndex)}:entry)}))}>Remove item</button></header><div className="page-editor-fields">{Object.entries(item).map(([key,value])=><ContentField key={key} name={key} value={value} disabled={busy||uploading} onChange={value=>itemField(index,itemIndex,key,value)} onBusy={setUploading} onError={setError} products={products}/>)}</div></div>)}<button className="admin-btn admin-btn-secondary" type="button" disabled={section.items.length>=12||busy||uploading} onClick={()=>change(current=>({...current,sections:current.sections.map((entry,i)=>i===index?{...entry,items:[...entry.items,Object.fromEntries(Object.keys(PAGE_DEFAULTS[slug].sections.find(base=>base.id===section.id).items[0]).map(key=>[key,""]))]}:entry)}))}><AdminIcon name="plus"/>Add item</button></div>}
      </div></details>)}</div>
      <div className="page-editor-savebar"><span>{currentDirty?"Unsaved changes":pendingPublish?"Saved draft differs from live page":"Up to date"}</span><div><a className={`admin-btn admin-btn-secondary${currentDirty?" is-disabled":""}`} aria-disabled={!!currentDirty} href={currentDirty?undefined:`/preview/${slug}`} target="_blank" rel="noopener noreferrer">Preview saved draft <AdminIcon name="external"/></a><button className="admin-btn admin-btn-secondary" type="button" disabled={busy||uploading||!currentDirty} onClick={()=>save("save")}>{busy?"Saving…":"Save draft"}</button><button className="admin-btn admin-btn-primary" type="button" disabled={busy||uploading||!pendingPublish} onClick={()=>save("publish")}>Publish changes</button></div></div>
    </>}
  </div>;
}
