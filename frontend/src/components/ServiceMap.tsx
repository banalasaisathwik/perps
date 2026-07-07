import { services } from "../data/services";
import type { Flow } from "../types/dashboard";

type ServiceMapProps = {
  activeFlow: Flow;
};

export function ServiceMap({ activeFlow }: ServiceMapProps) {
  return (
    <section className={`panel service-map ${activeFlow}`}>
      <div className="panel-title">
        <span className="step-badge">1</span>
        <span>Service Communication Map</span>
        <span className="live-badge">Live</span>
      </div>

      <div className="map-grid">
        {/* services is plain data, so the map can change without rewriting JSX. */}
        {services.map((service) => (
          <div key={service.id} className={`service-node ${service.id} ${service.lane}`}>
            <span className="node-icon">{service.title.slice(0, 2).toUpperCase()}</span>
            <strong>{service.title}</strong>
            <small>{service.tech}</small>
            <span className="node-health">Healthy</span>
          </div>
        ))}

        {/* These empty elements become animated connection lines through CSS classes. */}
        <div className="flow-line place a" />
        <div className="flow-line place b" />
        <div className="flow-line place c" />
        <div className="flow-line place d" />
        <div className="flow-line ws a" />
        <div className="flow-line ws b" />
        <div className="flow-line ws c" />
        <div className="flow-line mark a" />
        <div className="flow-line mark b" />
      </div>

      <div className="map-legend">
        <span><i className="legend-place" /> Place order path</span>
        <span><i className="legend-ws" /> WebSocket update path</span>
        <span><i className="legend-mark" /> Mark price flow</span>
      </div>
    </section>
  );
}
