"use client";
import React from 'react';

import { useEffect, useRef } from "react";
import { ParticleField } from "./ParticleField";

interface BootScreenProps {
  onEnter: () => void;
  /** Keep the intro on screen (preview route) instead of advancing. */
  stay?: boolean;
}

const LETTERS = "DOUNIA".split("");
const DURATION = 7000; // ms — a little longer than the old intro

/**
 * Boot/splash: layered aurora + starfield + drifting particle field, orbiting
 * ring and the shimmering "DOUNIA OS" wordmark — nothing else. Hands over on
 * its own after a short beat.
 */
export function BootScreen({ onEnter, stay = false }: BootScreenProps) {
  const onEnterRef = useRef(onEnter);

  useEffect(() => {
    onEnterRef.current = onEnter;
  }, [onEnter]);

  useEffect(() => {
    if (stay) return;
    const timer = window.setTimeout(() => onEnterRef.current(), DURATION);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " " || event.key === "Escape") {
        event.preventDefault();
        window.clearTimeout(timer);
        onEnterRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [stay]);

  return (
    <section className="d-boot3" onClick={onEnter} role="presentation" aria-label="Dounia OS">
      <div className="d-boot3-bg" aria-hidden="true">
        <div className="d-live d-live-aurora" />
        <div className="d-live d-live-stars" />
        <div className="d-boot3-rays" />
        <div className="d-boot3-scan" />
        <ParticleField />
      </div>

      <span className="d-boot3-orb a" aria-hidden="true" />
      <span className="d-boot3-orb b" aria-hidden="true" />
      <span className="d-boot3-ring" aria-hidden="true" />

      <div className="d-boot3-inner">
        <h1 className="d-boot3-logo" aria-label="Dounia OS">
          <span className="d-boot3-word">
            {LETTERS.map((letter, index) => (
              <i key={`${letter}-${index}`} style={{ animationDelay: `${index * 70}ms` }}>
                {letter}
              </i>
            ))}
          </span>
          <span className="d-boot3-os">OS</span>
          <span className="d-boot3-shine" aria-hidden="true" />
        </h1>
      </div>
    </section>
  );
}
