import { useEffect, useRef, useState } from "react";
import type { Entity } from "../ha/types";
import { name } from "../lib/home";

interface Props {
  camera: Entity | null;
  snapshotUrl: (camera: Entity) => string | null;
  /** go2rtc player URL, when configured. */
  liveUrl: string | null;
}

const SNAPSHOT_EVERY_MS = 2000;

export function CameraCard({ camera, snapshotUrl, liveUrl }: Props) {
  const [live, setLive] = useState(false);
  const [src, setSrc] = useState<string | null>(null);

  // HA rotates the token inside entity_picture, so always read the newest entity.
  const latest = useRef(camera);
  latest.current = camera;
  const cameraId = camera?.entity_id;

  // Still frames refresh every few seconds; live video only when asked, to save battery.
  useEffect(() => {
    if (!cameraId || live) return;
    const tick = () => latest.current && setSrc(snapshotUrl(latest.current));
    tick();
    const t = setInterval(tick, SNAPSHOT_EVERY_MS);
    return () => clearInterval(t);
  }, [cameraId, live, snapshotUrl]);

  const title = camera ? name(camera) : "Camera";

  return (
    <section className="card camera">
      <div className="card-head">
        <h2>{title}</h2>
        {liveUrl && (
          <button className="pill small" onClick={() => setLive((v) => !v)} aria-pressed={live}>
            {live ? "Still" : "Live"}
          </button>
        )}
      </div>
      <div className="frame">
        {live && liveUrl ? (
          <iframe src={liveUrl} title={`${title} live`} allow="autoplay; fullscreen" />
        ) : src ? (
          <img src={src} alt={`${title} snapshot`} />
        ) : (
          <div className="placeholder">{camera ? "No picture yet" : "No camera connected yet"}</div>
        )}
      </div>
    </section>
  );
}
