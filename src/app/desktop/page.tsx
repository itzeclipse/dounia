import React from 'react';

import type { Metadata } from "next";
import { DouniaOS } from "@/components/os/DouniaOS";

export const metadata: Metadata = {
  title: "Dounia OS v3 — Escritorio",
};

/** Kiosk style entry point: boots straight into the desktop, no boot screen. */
export default function DesktopPage() {
  return <DouniaOS startAt="desktop" />;
}
