import { useEffect, useRef, useState } from "react";
import { createStopwatch, shuffle } from "../utils/timing.js";

const PATTERNS = [
  [
    [1, 1, 0],
    [0, 1, 0],
    [0, 1, 0],
  ],
  [
    [1, 0, 1],
    [0, 1, 0],
    [1, 0, 1],
  ],
  [
    [0, 1, 0],
    [1, 1, 1],
    [0, 1, 0],
  ],
  [
    [1, 1, 1],
    [1, 0, 0],
    [0, 0, 0],
  ],
];

function createEmptyPattern() {
  return Array.from({ length: 3 }, () => [0, 0, 0]);
}

export default function BlockBuilder({ onComplete }) {
  const [targetPattern] = useState(() => shuffle(PATTERNS)[0]);
  const [userPattern, setUserPattern] = useState(createEmptyPattern);
  const [completed, setCompleted] = useState(false);
  const [message, setMessage] = useState("Copy the pattern into Your Copy.");
  const onCompleteRef = useRef(onComplete);
  const userPatternRef = useRef(userPattern);
  const correctionCountRef = useRef(0);
  const stopwatchRef = useRef(null);
  const completedRef = useRef(false);
  const mountedRef = useRef(false);

  onCompleteRef.current = onComplete;
  userPatternRef.current = userPattern;

  if (stopwatchRef.current === null) {
    stopwatchRef.current = createStopwatch();
  }

  useEffect(() => {
    mountedRef.current = true;
    stopwatchRef.current.start();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  function toggleCell(row, column) {
    if (!mountedRef.current || completedRef.current) {
      return;
    }

    const nextPattern = userPatternRef.current.map((cells) => [...cells]);
    if (nextPattern[row][column] === 1) {
      correctionCountRef.current += 1;
    }
    nextPattern[row][column] = nextPattern[row][column] === 1 ? 0 : 1;
    userPatternRef.current = nextPattern;
    setUserPattern(nextPattern);
  }

  function checkAnswer() {
    if (!mountedRef.current || completedRef.current) {
      return;
    }

    completedRef.current = true;
    setCompleted(true);

    let cellsCorrect = 0;
    let isCorrect = true;
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        if (userPatternRef.current[row][column] === targetPattern[row][column]) {
          cellsCorrect += 1;
        } else {
          isCorrect = false;
        }
      }
    }

    setMessage(
      isCorrect
        ? "Perfect match. Well done!"
        : `Not quite a match. ${cellsCorrect} of 9 cells matched.`,
    );
    onCompleteRef.current({
      isCorrect,
      cellsCorrect,
      completionTime: stopwatchRef.current.elapsed(),
      correctionCount: correctionCountRef.current,
    });
  }

  function renderGrid(pattern, editable, label) {
    return (
      <div>
        <h2 className="mb-3 text-center text-xl font-bold">{label}</h2>
        <div
          role="group"
          aria-label={`${label} grid`}
          className="grid grid-cols-3 gap-2"
        >
          {pattern.flatMap((row, rowIndex) =>
            row.map((filled, columnIndex) => {
              const cellLabel = `Row ${rowIndex + 1}, column ${columnIndex + 1}${filled ? ", filled" : ", empty"}`;
              return editable ? (
                <button
                  key={`${rowIndex}-${columnIndex}`}
                  type="button"
                  aria-label={cellLabel}
                  aria-pressed={Boolean(filled)}
                  disabled={completed}
                  onClick={() => toggleCell(rowIndex, columnIndex)}
                  className={`flex min-h-16 min-w-16 items-center justify-center rounded-lg border-2 text-2xl font-bold focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-800 ${
                    filled
                      ? "border-blue-950 bg-blue-700 text-white"
                      : "border-slate-500 bg-white text-slate-700 hover:bg-slate-100"
                  } disabled:cursor-default`}
                >
                  {filled ? "■" : ""}
                </button>
              ) : (
                <div
                  key={`${rowIndex}-${columnIndex}`}
                  role="img"
                  aria-label={cellLabel}
                  className={`flex min-h-12 min-w-12 items-center justify-center rounded-md border border-slate-500 text-xl ${
                    filled
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 text-transparent"
                  }`}
                >
                  {filled ? "■" : ""}
                </div>
              );
            }),
          )}
        </div>
      </div>
    );
  }

  return (
    <section className="flex w-full flex-col items-center gap-6 px-4">
      <p aria-live="polite" className="text-center text-xl font-semibold">
        {message}
      </p>
      <div className="flex w-full flex-col items-center justify-center gap-8 sm:flex-row sm:items-start">
        {renderGrid(targetPattern, false, "Target")}
        {renderGrid(userPattern, true, "Your Copy")}
      </div>
      <button
        type="button"
        onClick={checkAnswer}
        disabled={completed}
        className="min-h-16 rounded-xl border-2 border-sky-950 bg-sky-800 px-8 text-2xl font-bold text-white hover:bg-sky-900 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-800 disabled:cursor-default disabled:bg-slate-500"
      >
        Check Answer
      </button>
    </section>
  );
}
