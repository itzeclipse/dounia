"use client";
import React from "react";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { OSApp } from "@/lib/os/data";
import { AppIcon } from "../AppIcon";
import { IconClose, IconExternal, IconRefresh } from "../icons";

type Network = "tiktok" | "instagram" | "x";

interface SocialItem {
  id: string;
  kind: "video" | "image" | "post";
  text?: string;
  image?: string;
  video?: string;
  url?: string;
  date?: string;
  likes?: string;
}

interface SocialProfile {
  network: Network;
  handle: string;
  name: string;
  avatar: string;
  bio: string;
  followers: string;
  posts: string;
  likes: string;
  profileUrl: string;
  items: SocialItem[];
}

interface FeedAppProps {
  app: OSApp;
  onToast: (title: string, body: string) => void;
}

function networkOf(app: OSApp): Network {
  if (app.id === "instagram") return "instagram";
  if (app.id === "x") return "x";
  return "tiktok";
}

/**
 * Visor nativo de perfiles públicos. En lugar de incrustar la web (que bloquea
 * iframes y el login), lee el perfil desde /api/social y pinta una interfaz
 * propia: biografía, estadísticas, vídeos de TikTok, fotos de Instagram y
 * publicaciones de X. Los medios van por /api/media.
 */
export function FeedApp({ app, onToast }: FeedAppProps) {
  const feed = app.feed;
  const network = networkOf(app);
  const [draft, setDraft] = useState(feed?.defaultHandle ?? "");
  const [handle, setHandle] = useState(feed?.defaultHandle ?? "");
  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webView, setWebView] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [activeImage, setActiveImage] = useState<SocialItem | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const load = useCallback(async (target: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/social?network=${network}&handle=${encodeURIComponent(target)}`);
      const data = (await response.json()) as { profile?: SocialProfile; error?: string };
      if (!response.ok || !data.profile) throw new Error(data.error ?? "No se pudo leer el perfil.");
      setProfile(data.profile);
    } catch (caught) {
      setProfile(null);
      setError(caught instanceof Error ? caught.message : "No se pudo leer el perfil.");
    } finally {
      setLoading(false);
    }
  }, [network]);

  useEffect(() => {
    setDraft(feed?.defaultHandle ?? "");
    setHandle(feed?.defaultHandle ?? "");
  }, [app.id, feed?.defaultHandle]);

  useEffect(() => {
    if (!handle) return;
    void load(handle);
  }, [handle, load, nonce]);

  useEffect(() => {
    setAvatarFailed(false);
  }, [profile?.avatar]);

  useEffect(() => {
    if (!activeImage) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveImage(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeImage]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const next = draft.trim().replace(/^@+/, "");
    if (!next) return;
    setHandle(next);
    setNonce((value) => value + 1);
    setWebView(false);
  };

  const source = feed?.sources[0];
  const profileUrl = profile?.profileUrl ?? source?.open.replace("{handle}", handle) ?? "";
  const embedUrl = useMemo(
    () => (source ? source.embed.replace("{handle}", encodeURIComponent(handle)) : ""),
    [source, handle],
  );

  if (!feed) return null;

  const stats = [
    profile?.followers ? { label: "seguidores", value: profile.followers } : null,
    profile?.posts ? { label: "publicaciones", value: profile.posts } : null,
    profile?.likes ? { label: "me gusta", value: profile.likes } : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));

  return (
    <div className={`social-app social-${network}`}>
      <header className="social-top">
        <div className="social-brand">
          <AppIcon src={app.icon} alt={app.name} accent={app.accent} size={30} />
          <div>
            <strong>{app.name}</strong>
            <small>@{handle || feed.defaultHandle}</small>
          </div>
        </div>

        <form className="social-form" onSubmit={submit}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={feed.placeholder}
            aria-label={feed.placeholder}
            spellCheck={false}
          />
          <button type="submit">Ver</button>
        </form>

        <div className="social-actions">
          <button type="button" onClick={() => setWebView((value) => !value)}>
            {webView ? "Vista nativa" : "Vista web"}
          </button>
          <button
            type="button"
            className="icon"
            aria-label="Recargar"
            title="Recargar"
            onClick={() => {
              setNonce((value) => value + 1);
              onToast(app.name, "Actualizando el perfil…");
            }}
          >
            <IconRefresh />
          </button>
          <a className="open" href={profileUrl} target="_blank" rel="noreferrer noopener">
            <IconExternal /> Abrir app
          </a>
        </div>
      </header>

      {webView ? (
        <div className="social-web">
          {embedUrl ? (
            <iframe
              key={`${embedUrl}-${nonce}`}
              src={embedUrl}
              title={`${app.name} · vista web`}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture; clipboard-write"
              referrerPolicy="no-referrer"
            />
          ) : (
            <p>No hay una vista web disponible.</p>
          )}
        </div>
      ) : (
        <div className="social-scroll">
          {loading && !profile && (
            <div className="social-loading">
              <span className="social-avatar-skeleton" />
              <span className="social-lines-skeleton" />
              <div className="social-grid-skeleton">
                {Array.from({ length: 6 }).map((_, index) => (
                  <span key={`sk-${index}`} />
                ))}
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="social-error">
              <strong>No se pudo cargar el perfil</strong>
              <p>{error}</p>
              <div>
                <button type="button" onClick={() => setNonce((value) => value + 1)}>
                  <IconRefresh /> Reintentar
                </button>
                <a href={profileUrl} target="_blank" rel="noreferrer noopener">
                  <IconExternal /> Abrir {app.name}
                </a>
                <button type="button" onClick={() => setWebView(true)}>
                  Probar vista web
                </button>
              </div>
            </div>
          )}

          {profile && (
            <>
              <section className="social-profile">
                <span className="social-avatar">
                  {profile.avatar && !avatarFailed ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar}
                      alt={profile.name}
                      loading="lazy"
                      onError={() => setAvatarFailed(true)}
                    />
                  ) : (
                    <span>{profile.name.slice(0, 2).toUpperCase()}</span>
                  )}
                </span>
                <div className="social-identity">
                  <h2>{profile.name}</h2>
                  <span className="social-handle">@{profile.handle}</span>
                  {profile.bio ? <p>{profile.bio}</p> : null}
                  <a className="social-open" href={profile.profileUrl} target="_blank" rel="noreferrer noopener">
                    <IconExternal /> Ver en {app.name}
                  </a>
                </div>
                {stats.length > 0 && (
                  <div className="social-stats">
                    {stats.map((stat) => (
                      <span key={stat.label}>
                        <b>{stat.value}</b>
                        {stat.label}
                      </span>
                    ))}
                  </div>
                )}
              </section>

              <div className="social-feedhead">
                <h3>Publicaciones</h3>
                <span>
                  {profile.items.length > 0
                    ? `${profile.items.length} visibles · contenido público`
                    : "Sin publicaciones visibles"}
                </span>
              </div>

              {network === "instagram" && (
                <div className="social-photo-grid">
                  {profile.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="social-photo"
                      onClick={() => setActiveImage(item)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image} alt={item.text ?? "Publicación de Instagram"} loading="lazy" />
                      <span>{item.text}</span>
                    </button>
                  ))}
                </div>
              )}

              {network === "tiktok" && (
                <div className="social-video-grid">
                  {profile.items.map((item) => (
                    <article className="social-video" key={item.id}>
                      <span className="social-video-frame">
                        <video
                          src={item.video}
                          controls
                          playsInline
                          muted
                          preload="metadata"
                          onLoadedMetadata={(event) => {
                            try {
                              event.currentTarget.currentTime = 0.1;
                            } catch {
                              /* algunos navegadores no permiten seek sin datos */
                            }
                          }}
                        />
                      </span>
                      <span className="social-video-meta">
                        <span>@{profile.handle}</span>
                        <span>♥ {item.likes || "—"}</span>
                      </span>
                      <a href={item.url} target="_blank" rel="noreferrer noopener">
                        Abrir en TikTok
                      </a>
                    </article>
                  ))}
                </div>
              )}

              {network === "x" && (
                <div className="social-posts">
                  {profile.items.map((item) => (
                    <a
                      key={item.id}
                      className="social-post"
                      href={item.url}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      <header>
                        <strong>@{profile.handle}</strong>
                        {item.date ? <span>{item.date}</span> : null}
                      </header>
                      <p>{item.text}</p>
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image} alt="" loading="lazy" />
                      ) : null}
                      <footer>
                        <span>♥ {item.likes || "—"}</span>
                        <span>Abrir en X</span>
                      </footer>
                    </a>
                  ))}
                </div>
              )}

              {profile.items.length === 0 && (
                <p className="social-empty">
                  {app.name} no muestra publicaciones públicas de este perfil en este momento. Abre la app
                  para ver la cuenta completa.
                </p>
              )}
            </>
          )}
        </div>
      )}

      <footer className="social-foot">
        <span>Vista pública · contenido de {app.name}</span>
        <span>{feed.note}</span>
      </footer>

      {activeImage && (
        <div className="social-lightbox" role="dialog" aria-label="Publicación de Instagram">
          <button type="button" className="social-lightbox-close" onClick={() => setActiveImage(null)} aria-label="Cerrar">
            <IconClose />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={activeImage.image} alt={activeImage.text ?? ""} />
          <div className="social-lightbox-copy">
            <p>{activeImage.text}</p>
            <a href={activeImage.url} target="_blank" rel="noreferrer noopener">
              <IconExternal /> Ver en Instagram
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
