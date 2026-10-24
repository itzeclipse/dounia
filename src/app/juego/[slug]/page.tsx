import React from "react";

import type { Metadata } from "next";
import { DouniaOS } from "@/components/os/DouniaOS";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `CrazyGames · ${slug.replace(/-/g, " ")} — Dounia OS`,
    description: "Juega directamente en la consola de Dounia OS con el reproductor oficial de CrazyGames.",
  };
}

/**
 * Enlace de juego: /juego/<slug> abre la consola con ese título ya cargado.
 * Es la URL que se puede compartir; el embed oficial va en directo y el botón
 * «Motor» permite cambiar a Scramjet si hiciera falta.
 */
export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <DouniaOS startAt="desktop" themeOverride="playstation" initialGame={slug} />;
}
