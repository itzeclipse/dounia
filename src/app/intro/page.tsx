"use client";
import React from 'react';

import { BootScreen } from "@/components/os/BootScreen";

/** Preview route: shows the intro with the aura, without auto-advancing. */
export default function IntroPage() {
  return (
    <div className="d-os" data-theme="gamer">
      <BootScreen onEnter={() => undefined} stay />
    </div>
  );
}
