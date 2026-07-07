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
        <div className="eyebrow">Perps Backend Demo</div>
        <h1>Service Communication Dashboard</h1>
      </div>
      <div className="status-stack">
        <span
          className={`status-pill ${backendStatus === "connected" ? "healthy" : "warn"}`}
        >
          Backend {backendStatus}
        </span>
        <span className={`status-pill ${wsStatus === "connected" ? "healthy" : "warn"}`}>
          WebSocket {wsStatus}
        </span>
        <span className={`status-pill ${botRunning ? "active" : ""}`}>
          Bot {botRunning ? "running" : "idle"}
        </span>
      </div>
    </section>
  );
}
