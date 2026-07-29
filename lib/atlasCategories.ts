import {
  Building2,
  Castle,
  CircleHelp,
  Hotel,
  Landmark,
  MapPin,
  Mountain,
  Museum,
  BriefcaseBusiness,
  Camera,
  Store,
  Umbrella,
  UtensilsCrossed,
} from "lucide-react";

export const ATLAS_CATEGORIES = {
  città: {
    label: "Città",
    icon: Building2,
    color: "#2563eb",
  },

  borgo: {
    label: "Borgo",
    icon: Store,
    color: "#b45309",
  },

  monumento: {
    label: "Monumento",
    icon: Landmark,
    color: "#7c3aed",
  },

  museo: {
    label: "Museo",
    icon: Museum,
    color: "#9333ea",
  },

  castello: {
    label: "Castello",
    icon: Castle,
    color: "#6b21a8",
  },

  passo: {
    label: "Passo",
    icon: Mountain,
    color: "#475569",
  },

  panorama: {
    label: "Panorama",
    icon: Camera,
    color: "#ea580c",
  },

  spiaggia: {
    label: "Spiaggia",
    icon: Umbrella,
    color: "#0891b2",
  },

  ristorante: {
    label: "Ristorante",
    icon: UtensilsCrossed,
    color: "#dc2626",
  },

  hotel: {
    label: "Hotel",
    icon: Hotel,
    color: "#1d4ed8",
  },

  lavoro: {
    label: "Lavoro",
    icon: BriefcaseBusiness,
    color: "#334155",
  },

  altro: {
    label: "Altro",
    icon: CircleHelp,
    color: "#64748b",
  },
} as const;

export const DEFAULT_ATLAS_CATEGORY = {
  label: "Non specificata",
  icon: MapPin,
  color: "#6b7280",
};