import { useCallback, useEffect, useRef, useState } from "react";
import type { Entity, LiveStream } from "../ha/types";
import { name } from "../lib/home";
import { canGoLive } from "../lib/settings";
import type { HomeCtx } from "../ui";
import { HlsVideo } from "./HlsVideo";
import { Icon } from "./Icon";

const SNAPSHOT_EVERY_MS = 2000;

export function CameraCard({ camera, ctx }: { camera: Entity | null; ctx: HomeCtx }) {
  const [live, setLive] = useState(false);
  const [stream, setStream] = useState<LiveStream | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const liveable = camera ? canGoLive(ctx.settings, camera) : false;

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
  const { liveStream, notify } = ctx;

  const stopLive = useCallback(() => {
    setLive(false);
    setStream(null);
  }, []);
  const failLive = useCallback(() => {
    stopLive();
    notify("Live video stopped. Showing still pictures.");
  }, [stopLive, notify]);

  const toggleLive = async () => {
    if (live || !camera) return stopLive();
    setLive(true);
    const s = await liveStream(camera);
    if (s) setStream(s);
    else failLive();
  };

  const fullscreen = () => frameRef.current?.requestFullscreen?.().catch(() => {});

  return (
    <section className="card camera">
      <div className="frame" ref={frameRef}>
        {live && stream?.kind === "iframe" ? (
          <iframe src={stream.url} title={`${title} live`} allow="autoplay; fullscreen" />
        ) : live && stream?.kind === "hls" ? (
          <HlsVideo url={stream.url} title={`${title} live`} onFail={failLive} />
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
            {liveable && (
              <button className="glass-btn" onClick={toggleLive} aria-pressed={live}>
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
