"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const AtlasMapView = dynamic(
  () => import("@/components/atlas/AtlasMapView").then((mod) => mod.AtlasMapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[70vh] items-center justify-center rounded-2xl border bg-card">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Caricamento mappa...
        </div>
      </div>
    ),
  },
);

export default function AtlasMapPage() {
  return <AtlasMapView />;
}
