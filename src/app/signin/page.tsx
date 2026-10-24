import React from 'react';

import type { Metadata } from "next";
import { DouniaOS } from "@/components/os/DouniaOS";

export const metadata: Metadata = { title: "Dounia OS — Iniciar sesión" };

/** Deep link straight into the Chromebook-style sign-in screen. */
export default function SigninPage() {
  return <DouniaOS startAt="signin" />;
}
