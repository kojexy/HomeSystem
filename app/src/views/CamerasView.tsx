import { CameraCard } from "../components/CameraCard";
import { ofDomain } from "../lib/home";
import type { HomeCtx } from "../ui";

export function CamerasView({ ctx }: { ctx: HomeCtx }) {
  const cameras = ofDomain(ctx.entities, "camera");
  if (!cameras.length) return <CameraCard camera={null} ctx={ctx} />;
  return (
    <div className="camera-grid">
      {cameras.map((c) => (
        <CameraCard key={c.entity_id} camera={c} ctx={ctx} />
      ))}
    </div>
  );
}
