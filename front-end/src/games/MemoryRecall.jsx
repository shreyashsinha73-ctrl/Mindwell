import { useEffect, useRef, useState } from "react";
import { createStopwatch, shuffle } from "../utils/timing.js";

const DISTRACTORS = [
  { emoji: "⭐", label: "star" },
  { emoji: "🌙", label: "moon" },
  { emoji: "☀️", label: "sun" },
  { emoji: "☁️", label: "cloud" },
  { emoji: "🌍", label: "globe" },
];

export default function MemoryRecall({ onComplete, shared }) {
  const memoryItems = Array.isArray(shared?.memoryItems)
    ? shared.memoryItems
    : [];
  const hasMemoryItems = memoryItems.length > 0;
  const [options] = useState(() =>
    hasMemoryItems
      ? shuffle([
          ...memoryItems.map((item, index) => ({
            ...item,
            id: `remembered-${index}`,
            correct: true,
          })),
          ...DISTRACTORS.map((item, index) => ({
            ...item,
            id: `distractor-${index}`,
            correct: false,
          })),
        ])
      : [],
  );
  const [selectedIds, setSelectedIds] = useState([]);
  const [message, setMessage] = useState("Pick the 5 items you saw earlier.");
  const onCompleteRef = useRef(onComplete);
  const stopwatchRef = useRef(null);
  const selectedIdsRef = useRef([]);
  const completedRef = useRef(false);
  const mountedRef = useRef(false);
  const stopwatchStartedRef = useRef(false);

  onCompleteRef.current = onComplete;

  if (stopwatchRef.current === null) {
    stopwatchRef.current = createStopwatch();
  }

  useEffect(() => {
    mountedRef.current = true;

    if (!hasMemoryItems) {
      if (!completedRef.current) {
        completedRef.current = true;
        onCompleteRef.current({
          score: 0,
          falsePositives: 0,
          timeToSelect: 0,
          skipped: true,
        });
      }
    } else if (!stopwatchStartedRef.current) {
      stopwatchRef.current.start();
      stopwatchStartedRef.current = true;
    }

    return () => {
      mountedRef.current = false;
    };
  }, [hasMemoryItems]);

  function toggleOption(option) {
    if (!mountedRef.current || completedRef.current) {
      return;
    }

    const current = selectedIdsRef.current;
    if (current.includes(option.id)) {
      const next = current.filter((id) => id !== option.id);
      selectedIdsRef.current = next;
      setSelectedIds(next);
      setMessage("Pick the 5 items you saw earlier.");
      return;
    }

    if (current.length >= 5) {
      setMessage("You can choose up to 5 items. Change a choice to continue.");
      return;
    }

    const next = [...current, option.id];
    selectedIdsRef.current = next;
    setSelectedIds(next);
    setMessage("Pick the 5 items you saw earlier.");
  }

  function confirmSelection() {
    if (
      !mountedRef.current ||
      completedRef.current ||
      selectedIdsRef.current.length !== 5
    ) {
      return;
    }

    completedRef.current = true;
    const selected = options.filter((option) =>
      selectedIdsRef.current.includes(option.id),
    );
    const score = selected.filter((option) => option.correct).length;
    const falsePositives = selected.filter((option) => !option.correct).length;
    setMessage(`You remembered ${score} of 5.`);
    onCompleteRef.current({
      score,
      falsePositives,
      timeToSelect: stopwatchRef.current.elapsed(),
    });
  }

  if (!hasMemoryItems) {
    return null;
  }

  return (
    <section className="flex w-full max-w-3xl flex-col items-center gap-5 px-4">
      <p aria-live="polite" className="text-center text-xl font-semibold">
        {message}
      </p>
      <p className="text-lg font-medium" aria-live="off">
        Selected: {selectedIds.length} of 5
      </p>
      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {options.map((option) => {
          const isSelected = selectedIds.includes(option.id);

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isSelected}
              aria-label={`${option.label}, ${isSelected ? "selected" : "not selected"}`}
              onClick={() => toggleOption(option)}
              className={`relative flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border-4 px-2 py-3 text-center focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-800 ${
                isSelected
                  ? "border-blue-900 bg-blue-100 text-slate-950"
                  : "border-slate-400 bg-white text-slate-900 hover:bg-slate-100"
              }`}
            >
              <span aria-hidden="true" className="text-4xl leading-none">
                {option.emoji}
              </span>
              <span className="text-lg font-semibold capitalize">
                {option.label}
              </span>
              {isSelected && (
                <span
                  aria-hidden="true"
                  className="absolute right-2 top-1 text-xl font-extrabold text-blue-950"
                >
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={selectedIds.length !== 5}
        onClick={confirmSelection}
        className="min-h-16 w-full max-w-sm rounded-xl border-2 border-sky-950 bg-sky-800 px-8 text-2xl font-bold text-white hover:bg-sky-900 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-800 disabled:cursor-not-allowed disabled:border-slate-500 disabled:bg-slate-400"
      >
        Confirm
      </button>
    </section>
  );
}
