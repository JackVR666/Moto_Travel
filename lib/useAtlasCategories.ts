"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ATLAS_CATEGORIES } from "@/lib/atlasCategories";
export type AtlasCategoryOption={slug:string;label:string;color:string;icon:string};
const fallback:AtlasCategoryOption[]=Object.entries(ATLAS_CATEGORIES).map(([slug,c])=>({slug,label:c.label,color:c.color,icon:"map-pin"}));
export function useAtlasCategories(){
 const [categories,setCategories]=useState<AtlasCategoryOption[]>(fallback);
 useEffect(()=>{let active=true;supabase.from("atlas_categories").select("slug,label,color,icon").order("sort_order").then(({data,error})=>{if(active&&!error&&data)setCategories(data as AtlasCategoryOption[])});return()=>{active=false}},[]);
 return categories;
}
