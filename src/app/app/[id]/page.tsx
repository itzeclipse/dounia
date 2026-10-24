import React from 'react';

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DouniaOS } from "@/components/os/DouniaOS";
import { APPS } from "@/lib/os/data";

export const metadata: Metadata = { title: "Dounia OS v3 — App" };

/** Deep link: /app/<id> opens the desktop with that app already running. */
export default async function AppPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!APPS.some((app) => app.id === id)) notFound();
  return <DouniaOS startAt="desktop" initialApp={id} />;
}
