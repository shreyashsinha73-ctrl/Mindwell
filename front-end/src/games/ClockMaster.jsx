import { useEffect, useRef, useState } from "react";
import { createStopwatch } from "../utils/timing.js";

const NUMBERS = Array.from({ length: 12 }, (_, index) => index + 1);
const EXPECTED_HOUR_ANGLE = 335;
const EXPECTED_MINUTE_ANGLE = 60;

function angularError(actual, expected) {
  const difference = Math.abs(actual - expected) % 360;
  return Math.min(difference, 360 - difference);
}

function angleFromPoint(x, y) {
  return (Math.atan2(x, -y) * 180) / Math.PI;
}

/**
 * Scores clock number positions and hand angles.
 *
 * @param {Record<number, {x: number, y: number}>} placements Number positions as face percentages.
 * @param {number} hourHandAngle Hour hand angle clockwise from 12.
 * @param {number} minuteHandAngle Minute hand angle clockwise from 12.
 * @param {number} numberPlacementTime Milliseconds spent placing numbers.
 * @param {number} totalTime Total elapsed milliseconds.
 * @returns {{ numbersCorrect: number, meanNumberAngleError: number, hourHandCorrect: boolean, minuteHandCorrect: boolean, hourHandAngleError: number, minuteHandAngleError: number, numberPlacementTime: number, totalTime: number }} Assessment metrics.
 */
export function calculateClockMetrics(
  placements,
  hourHandAngle,
  minuteHandAngle,
  numberPlacementTime,
  totalTime,
) {
  const errors = NUMBERS.map((number) => {
    const position = placements[number];
    return angularError(
      angleFromPoint(position.x - 50, position.y - 50),
      (number % 12) * 30,
    );
  });
  const hourHandAngleError = angularError(
    hourHandAngle,
    EXPECTED_HOUR_ANGLE,
  );
  const minuteHandAngleError = angularError(
    minuteHandAngle,
    EXPECTED_MINUTE_ANGLE,
  );

  return {
    numbersCorrect: errors.filter((error) => error <= 15).length,
    meanNumberAngleError:
      Math.round(
        (errors.reduce((total, error) => total + error, 0) / errors.length) *
          10,
      ) / 10,
    hourHandCorrect: hourHandAngleError <= 15,
    minuteHandCorrect: minuteHandAngleError <= 15,
    hourHandAngleError,
    minuteHandAngleError,
    numberPlacementTime,
    totalTime,
  };
}

function handEndpoint(angle, length) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: 50 + Math.sin(radians) * length,
    y: 50 - Math.cos(radians) * length,
  };
}

export default function ClockMaster({ onComplete }) {
  const [stage, setStage] = useState("numbers");
  const [placements, setPlacements] = useState({});
  const [drag, setDrag] = useState(null);
  const [hourHandAngle, setHourHandAngle] = useState(null);
  const [minuteHandAngle, setMinuteHandAngle] = useState(null);
  const [message, setMessage] = useState(
    "Place each number where it belongs on the clock.",
  );
  const faceRef = useRef(null);
  const placementsRef = useRef({});
  const dragRef = useRef(null);
  const stageRef = useRef("numbers");
  const stopwatchRef = useRef(null);
  const placementTimeRef = useRef(null);
  const hourAngleRef = useRef(null);
  const minuteAngleRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  const mountedRef = useRef(false);
  const completedRef = useRef(false);

  onCompleteRef.current = onComplete;

  if (stopwatchRef.current === null) {
    stopwatchRef.current = createStopwatch();
  }

  useEffect(() => {
    mountedRef.current = true;
    stopwatchRef.current.start();
    return () => {
      mountedRef.current = false;
      dragRef.current = null;
    };
  }, []);

  function beginDrag(event, number, source) {
    if (stageRef.current !== "numbers") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const nextDrag = {
      number,
      pointerId: event.pointerId,
      source,
      x: event.clientX,
      y: event.clientY,
    };
    dragRef.current = nextDrag;
    setDrag(nextDrag);
  }

  function moveDrag(event, number) {
    const currentDrag = dragRef.current;
    if (
      !currentDrag ||
      currentDrag.number !== number ||
      currentDrag.pointerId !== event.pointerId
    ) {
      return;
    }

    const nextDrag = { ...currentDrag, x: event.clientX, y: event.clientY };
    dragRef.current = nextDrag;
    setDrag(nextDrag);
  }

  function endDrag(event, number) {
    const currentDrag = dragRef.current;
    if (
      !currentDrag ||
      currentDrag.number !== number ||
      currentDrag.pointerId !== event.pointerId
    ) {
      return;
    }

    const rect = faceRef.current?.getBoundingClientRect();
    if (rect) {
      const insideFace =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;

      if (insideFace) {
        const nextPlacements = {
          ...placementsRef.current,
          [number]: {
            x: ((event.clientX - rect.left) / rect.width) * 100,
            y: ((event.clientY - rect.top) / rect.height) * 100,
          },
        };
        placementsRef.current = nextPlacements;
        setPlacements(nextPlacements);
      } else if (currentDrag.source === "face") {
        const nextPlacements = { ...placementsRef.current };
        delete nextPlacements[number];
        placementsRef.current = nextPlacements;
        setPlacements(nextPlacements);
      }
    }

    dragRef.current = null;
    setDrag(null);
  }

  function cancelDrag(number) {
    if (dragRef.current?.number === number) {
      dragRef.current = null;
      setDrag(null);
    }
  }

  function finishNumberStage() {
    if (Object.keys(placementsRef.current).length !== NUMBERS.length) {
      return;
    }

    placementTimeRef.current = stopwatchRef.current.elapsed();
    stageRef.current = "hour";
    setStage("hour");
    setMessage(
      "Show the time: ten past eleven. Tap where the SHORT hour hand should point.",
    );
  }

  function setHand(event) {
    if (stageRef.current !== "hour" && stageRef.current !== "minute") {
      return;
    }

    const rect = faceRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const dx = event.clientX - rect.left - rect.width / 2;
    const dy = event.clientY - rect.top - rect.height / 2;
    const angle = (angleFromPoint(dx, dy) + 360) % 360;

    if (stageRef.current === "hour") {
      hourAngleRef.current = angle;
      setHourHandAngle(angle);
      stageRef.current = "minute";
      setStage("minute");
      setMessage("Tap where the LONG minute hand should point.");
      return;
    }

    minuteAngleRef.current = angle;
    setMinuteHandAngle(angle);
    stageRef.current = "finish";
    setStage("finish");
    setMessage("Both hands are set. Review them, then finish.");
  }

  function finishGame() {
    if (
      !mountedRef.current ||
      completedRef.current ||
      hourAngleRef.current === null ||
      minuteAngleRef.current === null
    ) {
      return;
    }

    completedRef.current = true;
    stageRef.current = "complete";
    setStage("complete");
    setMessage("Clock test complete.");
    onCompleteRef.current(
      calculateClockMetrics(
        placementsRef.current,
        hourAngleRef.current,
        minuteAngleRef.current,
        placementTimeRef.current,
        stopwatchRef.current.elapsed(),
      ),
    );
  }

  const hourEnd =
    hourHandAngle === null ? null : handEndpoint(hourHandAngle, 23);
  const minuteEnd =
    minuteHandAngle === null ? null : handEndpoint(minuteHandAngle, 34);

  return (
    <section className="flex w-full max-w-2xl flex-col items-center gap-5 px-4">
      <p aria-live="polite" className="text-center text-xl font-semibold">
        {message}
      </p>
      <div
        ref={faceRef}
        onPointerDown={stage === "hour" || stage === "minute" ? setHand : undefined}
        role={stage === "hour" || stage === "minute" ? "button" : undefined}
        aria-label={
          stage === "hour"
            ? "Clock face. Tap to set the short hour hand."
            : stage === "minute"
              ? "Clock face. Tap to set the long minute hand."
              : "Clock face"
        }
        className={`relative aspect-square w-full max-w-[420px] rounded-full border-8 border-slate-500 bg-white shadow-inner ${
          stage === "hour" || stage === "minute" ? "cursor-crosshair" : ""
        }`}
      >
        {NUMBERS.map((number) => {
          const position = placements[number];
          const isDragging = drag?.number === number;
          if (!position) {
            return null;
          }

          return (
            <button
              key={number}
              type="button"
              aria-label={`Number ${number}, placed`}
              onPointerDown={(event) => beginDrag(event, number, "face")}
              onPointerMove={(event) => moveDrag(event, number)}
              onPointerUp={(event) => endDrag(event, number)}
              onPointerCancel={() => cancelDrag(number)}
              className={`absolute z-10 flex min-h-14 min-w-14 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center rounded-full border-2 border-amber-900 bg-amber-200 text-xl font-bold text-slate-950 shadow ${
                isDragging ? "opacity-30" : ""
              }`}
              style={{ left: `${position.x}%`, top: `${position.y}%` }}
            >
              {number}
            </button>
          );
        })}
        {(hourEnd || minuteEnd) && (
          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            className="pointer-events-none absolute inset-0 z-20 h-full w-full"
          >
            {hourEnd && (
              <line
                x1="50"
                y1="50"
                x2={hourEnd.x}
                y2={hourEnd.y}
                stroke="#0f172a"
                strokeWidth="3"
                strokeLinecap="round"
              />
            )}
            {minuteEnd && (
              <line
                x1="50"
                y1="50"
                x2={minuteEnd.x}
                y2={minuteEnd.y}
                stroke="#1e40af"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            )}
            <circle cx="50" cy="50" r="2" fill="#0f172a" />
          </svg>
        )}
      </div>

      {drag && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-50 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-amber-950 bg-amber-300 text-xl font-bold text-slate-950 shadow-lg"
          style={{ left: `${drag.x}px`, top: `${drag.y}px` }}
        >
          {drag.number}
        </div>
      )}

      {stage === "numbers" && (
        <>
          <div className="flex w-full flex-wrap justify-center gap-2">
            {NUMBERS.filter((number) => !placements[number]).map((number) => (
              <button
                key={number}
                type="button"
                aria-label={`Drag number ${number} onto the clock`}
                onPointerDown={(event) => beginDrag(event, number, "bank")}
                onPointerMove={(event) => moveDrag(event, number)}
                onPointerUp={(event) => endDrag(event, number)}
                onPointerCancel={() => cancelDrag(number)}
                className={`flex min-h-14 min-w-14 touch-none items-center justify-center rounded-full border-2 border-amber-900 bg-amber-200 text-xl font-bold text-slate-950 shadow ${
                  drag?.number === number ? "opacity-30" : ""
                }`}
              >
                {number}
              </button>
            ))}
          </div>
          <p className="text-lg font-semibold">
            Numbers placed: {Object.keys(placements).length} of 12
          </p>
          <button
            type="button"
            disabled={Object.keys(placements).length !== NUMBERS.length}
            onClick={finishNumberStage}
            className="min-h-16 rounded-xl border-2 border-sky-950 bg-sky-800 px-8 text-2xl font-bold text-white hover:bg-sky-900 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-800 disabled:cursor-not-allowed disabled:border-slate-500 disabled:bg-slate-400"
          >
            Done placing
          </button>
        </>
      )}

      {(stage === "hour" || stage === "minute" || stage === "finish") && (
        <div className="text-center text-lg font-semibold">
          {hourHandAngle !== null && <p>Short hour hand has been set.</p>}
          {minuteHandAngle !== null && <p>Long minute hand has been set.</p>}
        </div>
      )}

      {stage === "finish" && (
        <button
          type="button"
          onClick={finishGame}
          className="min-h-16 rounded-xl border-2 border-sky-950 bg-sky-800 px-10 text-2xl font-bold text-white hover:bg-sky-900 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
        >
          Finish
        </button>
      )}
    </section>
  );
}
