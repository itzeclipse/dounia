import React from 'react';

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DouniaOS } from "@/components/os/DouniaOS";
import { THEMES, type ThemeId } from "@/lib/os/data";

export const metadata: Metadata = { title: "Dounia OS v3 — Estilo" };

/** Deep link: /theme/<windows11|macos|linux|gamer> previews a desktop style. */
export default async function ThemePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ app?: string }>;
}) {
  const { id } = await params;
  const { app } = await searchParams;
  if (!THEMES.some((theme) => theme.id === id)) notFound();
  return <DouniaOS startAt="desktop" themeOverride={id as ThemeId} initialApp={app} />;
}
