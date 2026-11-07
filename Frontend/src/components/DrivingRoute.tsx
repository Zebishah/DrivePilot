/** Decorative route connects the real people, lessons, and tools across Drive Pilot. */
export default function DrivingRoute({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      className={`dsp-driving-route ${className}`}
      viewBox="0 0 600 190"
      fill="none"
      aria-hidden="true"
    >
      <path
        className="dsp-driving-route__track"
        d="M18 148H130C190 148 164 48 232 48H340C405 48 365 148 435 148H580"
      />
      <path
        className="dsp-driving-route__flow"
        d="M18 148H130C190 148 164 48 232 48H340C405 48 365 148 435 148H580"
      />
      {[
        [90, 148],
        [282, 48],
        [500, 148],
      ].map(([cx, cy], index) => (
        <g key={cx}>
          <circle
            className="dsp-driving-route__halo"
            cx={cx}
            cy={cy}
            r="15"
            style={{ animationDelay: `${index * 0.7}s` }}
          />
          <circle cx={cx} cy={cy} r="5" fill="currentColor" />
        </g>
      ))}
    </svg>
  );
}
