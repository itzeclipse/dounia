import React from 'react';

import type { Metadata } from "next";
import { DouniaOS } from "@/components/os/DouniaOS";

export const metadata: Metadata = { title: "Dounia OS v3 — Todas las apps" };

/** Deep link that opens the app drawer with the whole catalogue. */
export default function AppsPage() {
  return <DouniaOS startAt="desktop" openDrawer />;
}
