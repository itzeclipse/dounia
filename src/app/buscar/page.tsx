import React from 'react';

import type { Metadata } from "next";
import { DouniaOS } from "@/components/os/DouniaOS";

export const metadata: Metadata = {
  title: "Dounia OS — Búsqueda universal",
  description: "La paleta universal de Dounia OS: apps, marcadores, historial y web por Scramjet V2.",
};

/** Enlace directo: /buscar abre el escritorio con la paleta universal ya abierta. */
export default function BuscarPage() {
  return <DouniaOS startAt="desktop" openPalette />;
}
