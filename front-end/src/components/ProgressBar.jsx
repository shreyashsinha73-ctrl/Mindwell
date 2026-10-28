/**
 * Displays the current game and a segmented progress indicator.
 *
 * @param {{ current: number, total: number }} props Current 1-based game and total game count.
 * @returns {import("react").JSX.Element | null} Accessible game progress, or null for an invalid total.
 */
export default function ProgressBar({ current, total }) {
  if (typeof total !== "number" || !Number.isFinite(total) || total <= 0) {
    return null;
  }

  const segmentCount = Math.floor(total);
  if (segmentCount < 1) {
    return null;
  }

  const currentGame = Math.min(
    segmentCount,
    Math.max(1, Number.isFinite(current) ? Math.floor(current) : 1),
  );
  const valueText = `Game ${currentGame} of ${segmentCount}`;

  return (
    <div className="w-full" role="progressbar"
      aria-valuemin={1}
      aria-valuemax={segmentCount}
      aria-valuenow={currentGame}
      aria-valuetext={valueText}
    >
      <p className="mb-3 text-lg font-semibold text-slate-900">{valueText}</p>
      <div className="flex w-full gap-2">
        {Array.from({ length: segmentCount }, (_, index) => {
          const filled = index < currentGame;
          return (
            <div
              key={index}
              aria-hidden="true"
              className={`h-3 flex-1 rounded-full border-2 ${
                filled
                  ? "border-sky-900 bg-sky-800"
                  : "border-slate-500 bg-transparent"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}