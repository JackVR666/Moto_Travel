"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

export function AtlasHome() {
  const router = useRouter();

  return (
    <div className="space-y-6">

      <div className="rounded-2xl border bg-card p-8">

        <h1 className="text-3xl font-bold">
          Atlante dei Luoghi
        </h1>

        <p className="mt-2 text-muted-foreground">
          Conserva tutti i luoghi visitati,
          indipendentemente dal mezzo utilizzato.
        </p>

        <Button
          className="mt-8 h-14"
          onClick={() => router.push("/atlas/nuovo")}
        >
          <MapPin className="mr-2 h-5 w-5" />
          Registra luogo
        </Button>

      </div>

    </div>
  );
}