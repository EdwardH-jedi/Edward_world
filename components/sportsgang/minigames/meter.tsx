"use client";

interface MeterProps {
  /** Current position, 0..1. */
  value: number;
  /** Optional target band, drawn behind the marker. */
  target?: { from: number; to: number };
  /** Label above the bar. */
  label: string;
  /** Read the bar as a face (centre is best) rather than a level. */
  centred?: boolean;
  tone?: "power" | "timing";
}

/**
 * The one meter primitive.
 *
 * Golf power, golf contact and the basketball release are all the same thing —
 * a moving bar the player stops — so they are all the same component. Drawn in
 * hard blocks with no easing, because the value it shows is read straight from
 * a simulation running at frame rate.
 */
export function Meter({ value, target, label, centred = false, tone = "power" }: MeterProps) {
  const clamped = Math.min(Math.max(value, 0), 1);

  return (
    <div className="sg-meter" data-tone={tone}>
      <p className="sg-meter__label">{label}</p>
      <div className="sg-meter__track">
        {target ? (
          <div
            className="sg-meter__target"
            style={{
              left: `${target.from * 100}%`,
              width: `${(target.to - target.from) * 100}%`,
            }}
          />
        ) : null}
        {centred ? <div className="sg-meter__centre" /> : null}
        <div className="sg-meter__fill" style={{ width: `${clamped * 100}%` }} />
        <div className="sg-meter__marker" style={{ left: `${clamped * 100}%` }} />
      </div>
    </div>
  );
}

interface GaugeProps {
  value: number;
  label: string;
  tone?: "stamina" | "pace";
}

/** A plain level readout, for values the player holds rather than stops. */
export function Gauge({ value, label, tone = "stamina" }: GaugeProps) {
  const clamped = Math.min(Math.max(value, 0), 1);
  return (
    <div className="sg-gauge" data-low={clamped < 0.25 || undefined} data-tone={tone}>
      <p className="sg-gauge__label">
        <span>{label}</span>
        <span>{Math.round(clamped * 100)}%</span>
      </p>
      <div className="sg-gauge__track">
        <div className="sg-gauge__fill" style={{ width: `${clamped * 100}%` }} />
      </div>
    </div>
  );
}
