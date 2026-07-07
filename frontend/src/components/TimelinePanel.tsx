import type { TimelineEvent } from "../types/dashboard";

type TimelinePanelProps = {
  events: TimelineEvent[];
  onClear: () => void;
};

export function TimelinePanel({ events, onClear }: TimelinePanelProps) {
  return (
    <section className="panel timeline-panel">
      <div className="panel-title">
        <span className="step-badge">4</span>
        <span>Event Timeline</span>
        <button className="chip" type="button" onClick={onClear}>
          Clear
        </button>
      </div>

      <div className="timeline-table">
        <div className="timeline-head">
          <span>Time</span>
          <span>Source</span>
          <span>Event</span>
          <span>Details</span>
        </div>
        {events.map((item) => (
          <div key={item.id} className="timeline-row">
            <span>{item.time}</span>
            <strong>{item.source}</strong>
            <span>{item.event}</span>
            <span>{item.details}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
