import React from 'react';

import type { Metadata } from "next";
import { DouniaOS } from "@/components/os/DouniaOS";

export const metadata: Metadata = {
  title: "DOUNIAOS",
  description: "DOUNIAOS — el sistema de Dounia: escritorio, juegos, proxies y fondos con aura.",
  applicationName: "DOUNIAOS",
};

/** Personal entry point with the full flow: intro → sign-in → desktop. */
export default function DouniaOsPage() {
  return <DouniaOS startAt="boot" />;
}
