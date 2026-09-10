import type { ArchitectureActivity, ArchitectureNode } from "../types/dashboard";

type ServiceMapProps = { activity: ArchitectureActivity };

const nodes: Array<{ id: ArchitectureNode; title: string; detail: string; tone: string }> = [
  { id: "client", title: "React Client", detail: "Trade UI + live updates", tone: "client" },
  { id: "backend", title: "Backend", detail: "REST API + WebSocket", tone: "backend" },
  { id: "redis", title: "Redis Streams", detail: "Inter-service messaging", tone: "redis" },
  { id: "engine", title: "Matching Engine", detail: "Orders, matching, positions, risk", tone: "engine" },
];

export function ServiceMap({ activity }: ServiceMapProps) {
  return (
    <section className="card architecture-card" aria-labelledby="architecture-heading">
      <div className="card-head"><b id="architecture-heading">System Architecture</b><small>lights up on live activity</small></div>
      <div className="architecture-body">
        {nodes.map((node, index) => (
          <div className="architecture-item" key={node.id}>
            {index > 0 && <span className="architecture-arrow" aria-hidden="true">↔</span>}
            <div className={`architecture-node ${node.tone} ${activity.node === node.id ? "active" : ""}`}>
              <b>{node.title}</b><span>{node.detail}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
