import { CameraCard } from "../components/CameraCard";
import { EventsFeed } from "../components/EventsFeed";
import { ofDomain } from "../lib/home";
import type { HomeCtx } from "../ui";

export function CamerasView({ ctx }: { ctx: HomeCtx }) {
  const cameras = ofDomain(ctx.entities, "camera");
  return (
    <>
      {cameras.length ? (
        <div className="camera-grid">
          {cameras.map((c) => (
            <CameraCard key={c.entity_id} camera={c} ctx={ctx} />
          ))}
        </div>
      ) : (
        <CameraCard camera={null} ctx={ctx} />
      )}
      <EventsFeed ctx={ctx} />
    </>
  );
}
