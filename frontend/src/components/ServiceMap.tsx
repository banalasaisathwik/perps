import type { ArchitectureActivity, ArchitectureNode } from "../types/dashboard";

type ServiceMapProps = {
  activity: ArchitectureActivity;
};

type NodeProps = {
  activeNode: ArchitectureNode | null;
  id: ArchitectureNode;
  title: string;
  detail: string;
  tone?: "client" | "backend" | "redis" | "engine";
};

function ArchitectureNodeCard({ activeNode, detail, id, title, tone }: NodeProps) {
  return (
    <div className={`architecture-node ${tone ?? ""} ${activeNode === id ? "active" : ""}`}>
      <b>{title}</b>
      <p>{detail}</p>
    </div>
  );
}

function activityLabel(activity: ArchitectureActivity) {
  switch (activity.kind) {
    case "manual-request":
      return "Order request moving";
    case "manual-response":
      return "Order response confirmed";
    case "book-update":
      return "Live order-book update";
    case "mark-price":
      return "Mark-price update";
    default:
      return "Hot trading path";
  }
}

export function ServiceMap({ activity }: ServiceMapProps) {
  const activeNode = activity.node;

  return (
    <section className="card architecture-card" id="architecture" aria-labelledby="architecture-heading">
      <div className="card-head">
        <b id="architecture-heading">Core architecture</b>
        <small>{activityLabel(activity)}</small>
        <small className="right">Engine owns trading state</small>
      </div>

      <div className="architecture-body">
        <div className="architecture-main">
          <ArchitectureNodeCard activeNode={activeNode} id="client" title="React Client" detail="Order entry and live book rendering." tone="client" />
          <span className="architecture-arrow" aria-hidden="true">↔</span>
          <ArchitectureNodeCard activeNode={activeNode} id="backend" title="Backend" detail="REST API and WebSocket gateway." tone="backend" />
          <span className="architecture-arrow" aria-hidden="true">↔</span>
          <ArchitectureNodeCard activeNode={activeNode} id="redis" title="Redis Streams" detail="Inter-service transport." tone="redis" />
          <span className="architecture-arrow" aria-hidden="true">↔</span>
          <ArchitectureNodeCard activeNode={activeNode} id="engine" title="Matching Engine" detail="Books, matching, risk, and positions." tone="engine" />
        </div>

        <div className="external-row" aria-label="External market-data route">
          <span className={`external ${activeNode === "binance" ? "active" : ""}`}>Binance Futures</span>
          <span aria-hidden="true">→</span>
          <span className={`external ${activeNode === "mark-price" ? "active" : ""}`}>Mark Price Service</span>
          <span aria-hidden="true">→ Redis → Engine</span>
        </div>

        <div className="flow-summary">
          <span><b>Manual order</b> Client → Backend → Redis → Engine</span>
          <span><b>Confirmed response</b> Engine → Redis → Backend → Client</span>
          <span><b>Live book</b> Engine → Redis → WebSocket → Client</span>
        </div>
      </div>
    </section>
  );
}
