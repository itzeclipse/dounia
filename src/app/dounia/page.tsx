import React from 'react';

import type { Metadata } from "next";
import { DouniaOS } from "@/components/os/DouniaOS";

export const metadata: Metadata = {
  title: "Dounia OS v3",
  description: "El escritorio de Dounia: apps, juegos, proxies y fondos en un solo sistema.",
};

/** Personal entry point — the desktop with Dounia's name on it. */
export default function DouniaPage() {
  return <DouniaOS startAt="desktop" />;
}
