import type { ConnectionStatus } from "../types/dashboard";

type DashboardHeaderProps = {
  backendStatus: ConnectionStatus;
  wsStatus: string;
};

export function DashboardHeader({
  backendStatus,
  wsStatus,
}: DashboardHeaderProps) {
  return (
    <header className="dashboard-header">
      <div className="brand">PERPS<span>.</span></div>
      <nav className="nav" aria-label="Primary navigation">
        <a href="#architecture">Architecture</a>
        <a href="#trade">Trade</a>
      </nav>
      <div className="grow" />
      <div className="status-stack">
        <span
          className={`status-pill ${backendStatus === "connected" ? "healthy" : "warn"}`}
        >
          REST <b>{backendStatus === "connected" ? "●" : "○"}</b>
        </span>
        <span className={`status-pill ${wsStatus === "connected" ? "healthy" : "warn"}`}>
          WS <b>{wsStatus === "connected" ? "●" : "○"}</b>
        </span>
      </div>
    </header>
  );
}
