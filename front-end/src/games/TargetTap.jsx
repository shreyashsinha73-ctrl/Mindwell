import { useCallback, useEffect, useRef, useState } from "react";
import { createCountdown, randomInt } from "../utils/timing.js";

const ROUND_SECONDS = 20;
const SPAWN_INTERVAL_MS = 1200;

function chooseSquare(previousSquare) {
  if (previousSquare === null) {
    return randomInt(0, 8);
  }

  const square = randomInt(0, 7);
  return square >= previousSquare ? square + 1 : square;
}

function createShape(index) {
  if (randomInt(1, 10) <= 6) {
    return { index, type: "target", label: "Target circle" };
  }

  if (randomInt(0, 1) === 0) {
    return { index, type: "square", label: "Pink square" };
  }

  return { index, type: "triangle", label: "Purple triangle" };
}

export default function TargetTap({ onComplete }) {
  const [shape, setShape] = useState(null);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [commissionErrors, setCommissionErrors] = useState(0);
  const [omissionErrors, setOmissionErrors] = useState(0);
  const [targetsShown, setTargetsShown] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(ROUND_SECONDS);
  const [message, setMessage] = useState("Tap the blue circles. Ignore other shapes.");
  const onCompleteRef = useRef(onComplete);
  const shapeRef = useRef(null);
  const previousSquareRef = useRef(null);
  const metricsRef = useRef({
    score: 0,
    hits: 0,
    commissionErrors: 0,
    omissionErrors: 0,
    targetsShown: 0,
  });
  const completedRef = useRef(false);
  const mountedRef = useRef(false);
  const intervalRef = useRef(null);
  const cancelCountdownRef = useRef(null);

  onCompleteRef.current = onComplete;

  const finish = useCallback(() => {
    if (!mountedRef.current || completedRef.current) {
      return;
    }

    completedRef.current = true;
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    cancelCountdownRef.current?.();
    cancelCountdownRef.current = null;

    if (shapeRef.current?.type === "target") {
      metricsRef.current.omissionErrors += 1;
      setOmissionErrors(metricsRef.current.omissionErrors);
    }
    shapeRef.current = null;
    setShape(null);
    setSecondsRemaining(0);
    setMessage(`Time is up. Final score: ${metricsRef.current.score}.`);
    onCompleteRef.current({ ...metricsRef.current });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    cancelCountdownRef.current = createCountdown(
      ROUND_SECONDS,
      setSecondsRemaining,
      finish,
    );
    intervalRef.current = setInterval(() => {
      if (!mountedRef.current || completedRef.current) {
        return;
      }

      if (shapeRef.current?.type === "target") {
        metricsRef.current.omissionErrors += 1;
        setOmissionErrors(metricsRef.current.omissionErrors);
      }

      const nextShape = createShape(chooseSquare(previousSquareRef.current));
      previousSquareRef.current = nextShape.index;
      shapeRef.current = nextShape;
      setShape(nextShape);

      if (nextShape.type === "target") {
        metricsRef.current.targetsShown += 1;
        setTargetsShown(metricsRef.current.targetsShown);
        setMessage("A blue target circle is showing. Tap it!");
      } else {
        setMessage(
          `${nextShape.label} is showing. Ignore it and wait for a blue circle.`,
        );
      }
    }, SPAWN_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      cancelCountdownRef.current?.();
      cancelCountdownRef.current = null;
    };
  }, [finish]);

  function handleTap(index) {
    const activeShape = shapeRef.current;
    if (
      !mountedRef.current ||
      completedRef.current ||
      activeShape === null ||
      activeShape.index !== index
    ) {
      return;
    }

    shapeRef.current = null;
    setShape(null);

    if (activeShape.type === "target") {
      metricsRef.current.score += 1;
      metricsRef.current.hits += 1;
      setScore(metricsRef.current.score);
      setHits(metricsRef.current.hits);
      setMessage("Target tapped. Good work!");
      return;
    }

    metricsRef.current.score -= 1;
    metricsRef.current.commissionErrors += 1;
    setScore(metricsRef.current.score);
    setCommissionErrors(metricsRef.current.commissionErrors);
    setMessage(`That was a ${activeShape.label.toLowerCase()}. Wait for a circle.`);
  }

  return (
    <section className="flex w-full max-w-lg flex-col items-center gap-4 px-4">
      <p aria-live="polite" className="text-center text-xl font-semibold">
        {message}
      </p>
      <div className="flex w-full flex-wrap justify-center gap-x-6 gap-y-2 text-lg font-semibold">
        <p>Score: {score}</p>
        <p>Time left: {secondsRemaining} seconds</p>
      </div>
      <p className="text-center text-base">
        Hits: {hits}. Commission errors: {commissionErrors}. Omission errors:{" "}
        {omissionErrors}. Targets shown: {targetsShown}.
      </p>
      <div
        aria-label="Target Tap 3 by 3 grid"
        className="grid w-full max-w-[420px] grid-cols-3 gap-3"
      >
        {Array.from({ length: 9 }, (_, index) => {
          const current = shape?.index === index ? shape : null;

          return (
            <button
              key={index}
              type="button"
              onClick={() => handleTap(index)}
              aria-label={
                current ? current.label : `Empty square ${index + 1}`
              }
              className="flex aspect-square min-h-16 min-w-16 items-center justify-center rounded-xl border-2 border-slate-400 bg-slate-200 text-4xl focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
            >
              {current?.type === "target" && (
                <span
                  aria-hidden="true"
                  className="h-12 w-12 rounded-full border-2 border-sky-900 bg-sky-600"
                />
              )}
              {current?.type === "square" && (
                <span aria-hidden="true" className="text-pink-800">
                  ■
                </span>
              )}
              {current?.type === "triangle" && (
                <span aria-hidden="true" className="text-purple-800">
                  ▲
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
