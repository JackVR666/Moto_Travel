"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

type Category = { slug: string; label: string; color: string; icon: string; sort_order: number };
const icons = ["map-pin","camera","landmark","castle","mountain","hotel","utensils-crossed","store","building-2","university","umbrella","briefcase-business","circle-help"];
const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";
export default function CategorieAtlantePage() {
  const router = useRouter();
  const [items,setItems] = useState<Category[]>([]);
  const [draft,setDraft] = useState<Category>({slug:"",label:"",color:"#0d9488",icon:"map-pin",sort_order:100});
  const [editing,setEditing] = useState<string | null>(null);
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);
  async function load() {
    const {data,error} = await supabase.from("atlas_categories").select("slug,label,color,icon,sort_order").order("sort_order");
    if(error) setMessage("Errore: "+error.message);
    else setItems((data || []) as Category[]);
  }
  useEffect(()=>{void load()},[]);
  async function save() {
    const label=draft.label.trim();
    const slug=editing || label.toLocaleLowerCase("it").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");
    if(!label || !slug) {setMessage("Inserisci un nome valido.");return;}
    if(!/^#[0-9a-fA-F]{6}$/.test(draft.color)) {setMessage("Colore non valido.");return;}
    setBusy(true);
    const {error}=await supabase.from("atlas_categories").upsert({...draft,slug,label});
    setBusy(false);
    if(error){setMessage(error.message);return;}
    setMessage("Categoria salvata.");
    setEditing(null);
    setDraft({slug:"",label:"",color:"#0d9488",icon:"map-pin",sort_order:100});
    await load();
  }
  async function remove(item:Category) {
    const {count,error:countError}=await supabase.from("places_visited").select("id",{count:"exact",head:true}).eq("category",item.slug);
    if(countError){setMessage(countError.message);return;}
    if(count && count>0){setMessage("Categoria utilizzata da "+count+" luoghi: riassegnali prima di eliminarla.");return;}
    if(!window.confirm("Eliminare "+item.label+"?"))return;
    const {error}=await supabase.from("atlas_categories").delete().eq("slug",item.slug);
    if(error)setMessage(error.message);else {setMessage("Categoria eliminata.");await load();}
  }
  return <main className="min-h-screen bg-background p-4 text-foreground">
    <div className="mx-auto max-w-3xl space-y-5">
      <Button variant="outline" onClick={()=>router.push("/?view=settings")}>← Impostazioni</Button>
      <div><h1 className="text-2xl font-black">Categorie Atlante</h1><p className="text-sm text-muted-foreground">Crea e modifica le categorie utilizzate per i luoghi visitati.</p></div>
      {message && <p className="rounded-lg border border-border p-3 text-sm">{message}</p>}
      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h2 className="font-bold">{editing?"Modifica categoria":"Nuova categoria"}</h2>
        <label className="block text-xs">Nome<input className={inputClass} value={draft.label} onChange={e=>setDraft({...draft,label:e.target.value})} placeholder="Es. Punto panoramico"/></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs">Colore<input type="color" className="mt-1 h-10 w-full" value={draft.color} onChange={e=>setDraft({...draft,color:e.target.value})}/></label>
          <label className="text-xs">Icona<select className={inputClass} value={draft.icon} onChange={e=>setDraft({...draft,icon:e.target.value})}>{icons.map(i=><option key={i} value={i}>{i}</option>)}</select></label>
        </div>
        <div className="flex gap-2"><Button disabled={busy} onClick={()=>void save()}>Salva categoria</Button>{editing&&<Button variant="outline" onClick={()=>{setEditing(null);setDraft({slug:"",label:"",color:"#0d9488",icon:"map-pin",sort_order:100})}}>Annulla</Button>}</div>
      </section>
      <section className="space-y-2">{items.map(item=><div key={item.slug} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"><span className="size-6 rounded-full" style={{background:item.color}}/><div className="min-w-0 flex-1"><div className="font-semibold">{item.label}</div><div className="text-xs text-muted-foreground">{item.slug} · {item.icon}</div></div><Button size="sm" variant="outline" onClick={()=>{setEditing(item.slug);setDraft(item)}}>Modifica</Button><Button size="sm" variant="outline" onClick={()=>void remove(item)}>Elimina</Button></div>)}</section>
    </div>
  </main>;
}
