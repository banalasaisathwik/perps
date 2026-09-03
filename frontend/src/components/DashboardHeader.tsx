import type { ConnectionStatus } from "../types/dashboard";

type DashboardHeaderProps = {
  backendStatus: ConnectionStatus;
  botRunning: boolean;
  wsStatus: string;
};

export function DashboardHeader({
  backendStatus,
  botRunning,
  wsStatus,
}: DashboardHeaderProps) {
  return (
    <section className="dashboard-header">
      <div>
        <div className="eyebrow">Perps trading</div>
        <h1>Trade with a clear view</h1>
      </div>
      <div className="status-stack">
        <span
          className={`status-pill ${backendStatus === "connected" ? "healthy" : "warn"}`}
        >
          Trading service {backendStatus}
        </span>
        <span className={`status-pill ${wsStatus === "connected" ? "healthy" : "warn"}`}>
          Live prices {wsStatus}
        </span>
        <span className={`status-pill ${botRunning ? "active" : ""}`}>
          Price bot {botRunning ? "running" : "paused"}
        </span>
      </div>
    </section>
  );
}
