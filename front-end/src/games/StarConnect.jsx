import { useCallback, useEffect, useRef, useState } from "react";
import { createCountdown, createStopwatch, randomInt } from "../utils/timing.js";

const LABELS = ["1", "A", "2", "B", "3", "C", "4", "D", "5", "E"];
const MIN_DISTANCE = 18;

function createPositions() {
  const positions = [];

  for (let index = 0; index < LABELS.length; index += 1) {
    let placed = false;

    for (let attempt = 0; attempt < 200; attempt += 1) {
      const candidate = {
        x: randomInt(10, 90),
        y: randomInt(10, 90),
      };

      if (
        positions.every(
          (position) =>
            Math.hypot(position.x - candidate.x, position.y - candidate.y) >=
            MIN_DISTANCE,
        )
      ) {
        positions.push(candidate);
        placed = true;
        break;
      }
    }

    if (!placed) {
      return LABELS.map((_, fallbackIndex) => ({
        x: 10 + (fallbackIndex % 5) * 20,
        y: fallbackIndex < 5 ? 25 : 75,
      }));
    }
  }

  return positions;
}

export default function StarConnect({ onComplete }) {
  const [positions] = useState(createPositions);
  const [stepsCompleted, setStepsCompleted] = useState(0);
  const [errors, setErrors] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(120);
  const [wrongLabel, setWrongLabel] = useState(null);
  const [message, setMessage] = useState(
    "Tap in order: 1, A, 2, B, 3, C, 4, D, 5, E.",
  );
  const onCompleteRef = useRef(onComplete);
  const stopwatchRef = useRef(null);
  const stepsRef = useRef(0);
  const errorsRef = useRef(0);
  const moveTimesRef = useRef([]);
  const completedRef = useRef(false);
  const mountedRef = useRef(false);
  const cancelCountdownRef = useRef(null);
  const flashTimeoutRef = useRef(null);

  onCompleteRef.current = onComplete;

  if (stopwatchRef.current === null) {
    stopwatchRef.current = createStopwatch();
  }

  const finish = useCallback((completed) => {
    if (!mountedRef.current || completedRef.current) {
      return;
    }

    completedRef.current = true;
    cancelCountdownRef.current?.();
    if (flashTimeoutRef.current !== null) {
      clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = null;
    }

    const moveTimes = moveTimesRef.current;
    const totalTime = stopwatchRef.current.elapsed();
    setWrongLabel(null);
    setMessage(
      completed
        ? "Sequence complete."
        : "Time is up. The sequence is not complete.",
    );
    onCompleteRef.current({
      completed,
      stepsCompleted: stepsRef.current,
      errors: errorsRef.current,
      totalTime,
      averageMoveTime:
        moveTimes.length === 0
          ? null
          : moveTimes.reduce((total, duration) => total + duration, 0) /
            moveTimes.length,
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    stopwatchRef.current.start();
    cancelCountdownRef.current = createCountdown(
      120,
      setSecondsRemaining,
      () => finish(false),
    );

    return () => {
      mountedRef.current = false;
      cancelCountdownRef.current?.();
      cancelCountdownRef.current = null;
      if (flashTimeoutRef.current !== null) {
        clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = null;
      }
    };
  }, [finish]);

  function handleTap(index) {
    if (completedRef.current || !mountedRef.current) {
      return;
    }

    if (flashTimeoutRef.current !== null) {
      clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = null;
    }

    if (index !== stepsRef.current) {
      errorsRef.current += 1;
      setErrors(errorsRef.current);
      setWrongLabel(LABELS[index]);
      setMessage(`Not that one. Continue with ${LABELS[stepsRef.current]}.`);
      flashTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current && !completedRef.current) {
          setWrongLabel(null);
        }
        flashTimeoutRef.current = null;
      }, 700);
      return;
    }

    moveTimesRef.current.push(stopwatchRef.current.lap());
    stepsRef.current += 1;
    setStepsCompleted(stepsRef.current);
    setWrongLabel(null);

    if (stepsRef.current === LABELS.length) {
      finish(true);
      return;
    }

    setMessage(`Good. Now tap ${LABELS[stepsRef.current]}.`);
  }

  return (
    <section className="flex w-full max-w-xl flex-col items-center gap-4 px-4">
      <p aria-live="polite" className="text-center text-xl font-semibold">
        {message}
      </p>
      <p className="text-lg font-medium" aria-label="Time remaining">
        Time left: {secondsRemaining} seconds
      </p>
      <p className="text-lg">
        Completed {stepsCompleted} of {LABELS.length}. Errors: {errors}.
      </p>
      <div
        aria-label="Star Connect play area"
        className="relative aspect-square w-full max-w-[480px] overflow-hidden rounded-2xl border-4 border-slate-400 bg-slate-100"
      >
        {LABELS.map((label, index) => {
          const isLetter = Number.isNaN(Number(label));
          const isCorrectlyTapped = index < stepsCompleted;
          const isWrong = wrongLabel === label;

          return (
            <button
              key={label}
              type="button"
              aria-label={`${isLetter ? "Letter" : "Number"} ${label}${isCorrectlyTapped ? ", completed" : ""}`}
              disabled={isCorrectlyTapped || completedRef.current}
              onClick={() => handleTap(index)}
              className={`absolute flex min-h-16 min-w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center border-2 text-2xl font-bold shadow-sm transition-colors disabled:cursor-default ${
                isCorrectlyTapped
                  ? "border-green-800 bg-green-700 text-white"
                  : isWrong
                    ? "border-red-900 bg-red-700 text-white"
                    : isLetter
                      ? "rounded-2xl border-teal-900 bg-teal-100 text-teal-950 hover:bg-teal-200"
                      : "rounded-full border-amber-900 bg-amber-100 text-amber-950 hover:bg-amber-200"
              }`}
              style={{
                left: `${positions[index].x}%`,
                top: `${positions[index].y}%`,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
