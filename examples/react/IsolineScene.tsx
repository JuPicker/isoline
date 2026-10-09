"use client";

/**
 * Isoline as a React component.
 *
 * Copy isoline.js and isoline.d.ts next to this file (or adjust the import).
 * The engine is created in the browser only, so this works in Next.js as is:
 *
 *   <IsolineScene options={{ scene: "keyboard", accent: "#ff6a3d" }} style={{ aspectRatio: "16 / 9" }} />
 */
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import type { IsoInstance, IsoOptions } from "./isoline";

type Props = {
  options?: Partial<IsoOptions>;
  className?: string;
  style?: CSSProperties;
  /** Hands you the instance, to call toSVG(), pause()... */
  onReady?: (iso: IsoInstance) => void;
};

export function IsolineScene({ options = {}, className, style, onReady }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const iso = useRef<IsoInstance | null>(null);
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });

  // one engine for the component's life, loaded in the browser
  useEffect(() => {
    let dead = false;
    import("./isoline").then(({ default: Isoline }) => {
      if (dead || !host.current) return;
      iso.current = new Isoline(host.current, latest.current);
      onReady?.(iso.current);
    });
    return () => {
      dead = true;
      iso.current?.destroy();
      iso.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // later changes go through set(): the scene restarts only when its layout changes
  const key = JSON.stringify(options);
  useEffect(() => {
    iso.current?.set(latest.current);
  }, [key]);

  return <div ref={host} className={className} style={{ width: "100%", height: "100%", ...style }} />;
}
