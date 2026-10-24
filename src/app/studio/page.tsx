import React from 'react';

import type { Metadata } from "next";
import { DouniaOS } from "@/components/os/DouniaOS";

export const metadata: Metadata = {
  title: "Dounia OS v3 — Estudio de fondos",
};

/** Deep link straight into the wallpaper studio. */
export default function StudioPage() {
  return <DouniaOS startAt="desktop" openStudio />;
}
