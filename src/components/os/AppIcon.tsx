"use client";
import React from 'react';

import { useEffect, useState } from "react";

interface AppIconProps {
  src: string;
  alt: string;
  accent: string;
  className?: string;
  size?: number;
}

/**
 * Brand icon with a graceful fallback: if the remote logo cannot load we render
 * a monogram tile in the brand colour, so the desktop never shows a broken image.
 */
export function AppIcon({ src, alt, accent, className, size = 48 }: AppIconProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [src]);

  if (failed || !src) {
    return (
      <span
        className={className}
        aria-label={alt}
        role="img"
        style={{
          width: size,
          height: size,
          display: "grid",
          placeItems: "center",
          borderRadius: Math.round(size * 0.28),
          background: `linear-gradient(150deg, ${accent}33, #0b0b0f 72%)`,
          border: `1px solid ${accent}55`,
          color: "#fff",
          fontFamily: "Orbitron, sans-serif",
          fontSize: Math.round(size * 0.34),
          letterSpacing: "0.04em",
          flex: "none",
        }}
      >
        {alt.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      onLoad={() => setLoaded(true)}
      style={{ opacity: loaded ? 1 : 0.85, transition: "opacity .25s ease" }}
    />
  );
}
