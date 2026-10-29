import { useEffect, useRef, useState } from "react";
import type { Entity } from "../ha/types";
import { name } from "../lib/home";
import { liveStreamUrl } from "../lib/settings";
import type { HomeCtx } from "../ui";
import { Icon } from "./Icon";

const SNAPSHOT_EVERY_MS = 2000;

export function CameraCard({ camera, ctx }: { camera: Entity | null; ctx: HomeCtx }) {
  const [live, setLive] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const liveUrl = camera ? liveStreamUrl(ctx.settings, camera.entity_id) : null;

  // HA rotates the token inside entity_picture, so always read the newest entity.
  const latest = useRef(camera);
  latest.current = camera;
  const cameraId = camera?.entity_id;
  const { snapshotUrl } = ctx;

  // Still frames refresh every few seconds; live video only when asked, to save battery.
  useEffect(() => {
    if (!cameraId || live) return;
    const tick = () => latest.current && setSrc(snapshotUrl(latest.current));
    tick();
    const t = setInterval(tick, SNAPSHOT_EVERY_MS);
    return () => clearInterval(t);
  }, [cameraId, live, snapshotUrl]);

  const title = camera ? name(camera) : "Camera";
  const fullscreen = () => frameRef.current?.requestFullscreen?.().catch(() => {});

  return (
    <section className="card camera">
      <div className="frame" ref={frameRef}>
        {live && liveUrl ? (
          <iframe src={liveUrl} title={`${title} live`} allow="autoplay; fullscreen" />
        ) : src ? (
          <img src={src} alt={`${title} camera`} />
        ) : (
          <div className="placeholder">
            <Icon name="camera" size={32} />
            <span>{camera ? "Waiting for picture…" : "No camera yet"}</span>
          </div>
        )}
        <div className="overlay">
          <span className="cam-name">
            <span className={`rec ${live ? "on" : ""}`} />
            {title}
          </span>
          <span className="cam-actions">
            {liveUrl && (
              <button className="glass-btn" onClick={() => setLive((v) => !v)} aria-pressed={live}>
                {live ? "Live" : "Go live"}
              </button>
            )}
            {camera && (
              <button className="glass-btn icon" onClick={fullscreen} aria-label="Full screen">
                <Icon name="expand" size={16} />
              </button>
            )}
          </span>
        </div>
      </div>
    </section>
  );
}
