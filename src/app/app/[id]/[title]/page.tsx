import React from "react";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DouniaOS } from "@/components/os/DouniaOS";
import { APPS } from "@/lib/os/data";

export const metadata: Metadata = { title: "Dounia OS — Cinemitas" };

/** Enlace compartible: /app/cinemitas/<id> abre la sala con ese título. */
export default async function CinemitasTitlePage({
  params,
}: {
  params: Promise<{ id: string; title: string }>;
}) {
  const { id, title } = await params;
  if (id !== "cinemitas" || !APPS.some((app) => app.id === id)) notFound();
  return <DouniaOS startAt="desktop" initialApp={id} initialCine={title} />;
}
