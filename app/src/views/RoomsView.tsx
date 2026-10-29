import { EntityTile } from "../components/EntityTile";
import { domainOf } from "../lib/domains";
import { groupByRoom, roomTemperature } from "../lib/home";
import type { HomeCtx } from "../ui";

export function RoomsView({ ctx }: { ctx: HomeCtx }) {
  const rooms = groupByRoom(ctx.entities, ctx.rooms);

  if (!rooms.length) return <p className="muted empty">No devices yet. Add them in Home Assistant and give each one an area.</p>;

  return (
    <div className="rooms">
      {rooms.map((room) => {
        const lightsOn = room.entities.filter((e) => ["light", "fan"].includes(domainOf(e.entity_id)) && e.state === "on");
        const temp = roomTemperature(room);
        return (
          <section key={room.id} className="card room">
            <div className="card-head">
              <h2>
                {room.name}
                {temp && <span className="room-temp">{temp}</span>}
              </h2>
              {lightsOn.length > 0 && (
                <button
                  className="pill small"
                  onClick={() =>
                    ctx.run(...lightsOn.map((e) => ({ domain: domainOf(e.entity_id), service: "turn_off", data: { entity_id: e.entity_id } })))
                  }
                >
                  Lights off
                </button>
              )}
            </div>
            <div className="tiles">
              {room.entities.map((e) => (
                <EntityTile key={e.entity_id} e={e} ctx={ctx} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
