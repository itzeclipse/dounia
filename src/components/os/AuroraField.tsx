"use client";
import React from 'react';

/**
 * Pure-CSS aurora: three blurred colour fields drifting on different clocks,
 * a perspective grid and a soft veil. No images, no video, no canvas — it
 * costs nothing and never stops moving.
 */
export function AuroraField({ subtle = false }: { subtle?: boolean }) {
  return (
    <div className={`d-aurora${subtle ? " is-subtle" : ""}`} aria-hidden="true">
      <span className="d-aurora-blob a1" />
      <span className="d-aurora-blob a2" />
      <span className="d-aurora-blob a3" />
      <span className="d-aurora-veil" />
      <span className="d-aurora-grid" />
      <span className="d-aurora-scan" />
    </div>
  );
}
