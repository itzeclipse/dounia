import React from 'react';

import type { Metadata, Viewport } from "next";
import { Audiowide, Chakra_Petch, Rajdhani } from "next/font/google";
import "./globals.css";
import "./os.css";
import "./os-v3.css";
import "./os-signin.css";
import "./os-consoles.css";
import "./os-cloud.css";
import "./os-boot.css";
import "./os-aura.css";
import "./os-live.css";
import "./os-intro.css";
import "./os-intro-v4.css";
import "./os-od.css";
import "./os-boot3.css";
import "./os-shell.css";
import "./os-browser.css";
import "./os-palette.css";
import "./os-theme.css";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const chakra = Chakra_Petch({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-chakra",
  display: "swap",
});

const audiowide = Audiowide({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-audiowide",
  display: "swap",
});

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-rajdhani",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — tu sistema operativo en el navegador`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — tu sistema operativo en el navegador`,
    description: SITE_DESCRIPTION,
    url: "/",
    images: [{ url: "/os/dounia-avatar.webp", width: 512, height: 512, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — tu sistema operativo en el navegador`,
    description: SITE_DESCRIPTION,
    images: ["/os/dounia-avatar.webp"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#050506",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${chakra.variable} ${audiowide.variable} ${rajdhani.variable}`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
