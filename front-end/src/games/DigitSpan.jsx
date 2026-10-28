import { useEffect, useRef, useState } from "react";
import { createStopwatch, randomInt } from "../utils/timing.js";

const MAX_LENGTH = 9;
const DIGIT_DURATION_MS = 1000;
const DIGIT_GAP_MS = 300;
const FEEDBACK_DURATION_MS = 900;

function createDigits(length) {
  return Array.from({ length }, () => String(randomInt(0, 9)));
}

export default function DigitSpan({ onComplete }) {
  const [phase, setPhase] = useState("displaying");
  const [mode, setMode] = useState("forward");
  const [level, setLevel] = useState(3);
  const [trial, setTrial] = useState(1);
  const [sequence, setSequence] = useState(() => createDigits(3));
  const [displayIndex, setDisplayIndex] = useState(0);
  const [digitVisible, setDigitVisible] = useState(true);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [message, setMessage] = useState("Watch the numbers carefully.");
  const [forwardBest, setForwardBest] = useState(0);
  const [backwardBest, setBackwardBest] = useState(0);
  const modeRef = useRef("forward");
  const levelRef = useRef(3);
  const trialRef = useRef(1);
  const sequenceRef = useRef(sequence);
  const phaseRef = useRef("displaying");
  const forwardBestRef = useRef(0);
  const backwardBestRef = useRef(0);
  const answerRef = useRef("");
  const feedbackNextRef = useRef(null);
  const timerRef = useRef(null);
  const stopwatchRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  const mountedRef = useRef(false);
  const completedRef = useRef(false);

  onCompleteRef.current = onComplete;
  sequenceRef.current = sequence;
  answerRef.current = answer;

  if (stopwatchRef.current === null) {
    stopwatchRef.current = createStopwatch();
  }

  useEffect(() => {
    mountedRef.current = true;
    stopwatchRef.current.start();
    return () => {
      mountedRef.current = false;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mountedRef.current || completedRef.current) {
      return undefined;
    }

    if (phase === "displaying") {
      setMessage(
        `Memorize the ${level}-digit sequence (${mode}). Trial ${trial} of 2.`,
      );

      if (digitVisible) {
        timerRef.current = setTimeout(() => {
          if (mountedRef.current && !completedRef.current) {
            setDigitVisible(false);
          }
        }, DIGIT_DURATION_MS);
      } else {
        timerRef.current = setTimeout(() => {
          if (!mountedRef.current || completedRef.current) {
            return;
          }

          if (displayIndex + 1 >= sequence.length) {
            phaseRef.current = "input";
            setPhase("input");
            setMessage(
              mode === "forward"
                ? "Type the numbers in the same order."
                : "Type the numbers in reverse order.",
            );
            return;
          }

          setDisplayIndex((index) => index + 1);
          setDigitVisible(true);
        }, DIGIT_GAP_MS);
      }
    }

    if (phase === "feedback") {
      timerRef.current = setTimeout(() => {
        if (mountedRef.current && !completedRef.current) {
          feedbackNextRef.current?.();
        }
      }, FEEDBACK_DURATION_MS);
    }

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase, digitVisible, displayIndex, sequence, level, mode, trial]);

  function beginRound(nextMode, nextLevel, nextTrial) {
    const nextSequence = createDigits(nextLevel);
    modeRef.current = nextMode;
    levelRef.current = nextLevel;
    trialRef.current = nextTrial;
    sequenceRef.current = nextSequence;
    phaseRef.current = "displaying";
    setMode(nextMode);
    setLevel(nextLevel);
    setTrial(nextTrial);
    setSequence(nextSequence);
    setDisplayIndex(0);
    setDigitVisible(true);
    setAnswer("");
    answerRef.current = "";
    setFeedback("");
    setPhase("displaying");
  }

  function finishGame() {
    if (!mountedRef.current || completedRef.current) {
      return;
    }

    completedRef.current = true;
    phaseRef.current = "done";
    setPhase("done");
    setMessage("Digit span test complete.");
    onCompleteRef.current({
      forward: forwardBestRef.current,
      backward: backwardBestRef.current,
    });
  }

  function startBackwardPhase() {
    modeRef.current = "backward";
    levelRef.current = 3;
    trialRef.current = 1;
    phaseRef.current = "instruction";
    setMode("backward");
    setLevel(3);
    setTrial(1);
    setAnswer("");
    answerRef.current = "";
    setPhase("instruction");
    setMessage("Now type the numbers in reverse. If you see 1 2 3, type 3 2 1.");
  }

  function prepareNextTrial(correct) {
    const currentMode = modeRef.current;
    const currentLevel = levelRef.current;
    const currentTrial = trialRef.current;

    if (correct) {
      if (currentMode === "forward") {
        forwardBestRef.current = currentLevel;
        setForwardBest(currentLevel);
      } else {
        backwardBestRef.current = currentLevel;
        setBackwardBest(currentLevel);
      }

      if (currentLevel === MAX_LENGTH) {
        if (currentMode === "forward") {
          startBackwardPhase();
        } else {
          finishGame();
        }
        return;
      }

      beginRound(currentMode, currentLevel + 1, 1);
      return;
    }

    if (currentTrial < 2) {
      beginRound(currentMode, currentLevel, currentTrial + 1);
      return;
    }

    if (currentMode === "forward") {
      startBackwardPhase();
    } else {
      finishGame();
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!mountedRef.current || completedRef.current || phaseRef.current !== "input") {
      return;
    }

    const expectedDigits =
      modeRef.current === "forward"
        ? sequenceRef.current.join("")
        : [...sequenceRef.current].reverse().join("");
    const correct = answerRef.current === expectedDigits;
    setFeedback(correct ? "Correct" : "Not quite");
    setMessage(correct ? "Correct" : "Not quite");
    feedbackNextRef.current = () => prepareNextTrial(correct);
    phaseRef.current = "feedback";
    setPhase("feedback");
  }

  function continueToBackward() {
    if (!mountedRef.current || completedRef.current || phaseRef.current !== "instruction") {
      return;
    }
    beginRound("backward", 3, 1);
  }

  return (
    <section className="flex w-full max-w-xl flex-col items-center gap-5 px-4">
      <p aria-live="polite" className="min-h-8 text-center text-xl font-semibold">
        {message}
      </p>

      {phase === "instruction" && (
        <div className="flex flex-col items-center gap-5">
          <p className="text-center text-2xl font-bold">
            Now type the numbers in reverse. If you see 1 2 3, type 3 2 1.
          </p>
          <button
            type="button"
            onClick={continueToBackward}
            className="min-h-16 rounded-xl border-2 border-sky-950 bg-sky-800 px-10 text-2xl font-bold text-white hover:bg-sky-900 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
          >
            Continue
          </button>
        </div>
      )}

      {phase === "displaying" && (
        <div className="flex min-h-40 items-center justify-center">
          {digitVisible && (
            <span
              aria-live="off"
              className="text-8xl font-extrabold leading-none text-slate-950 sm:text-9xl"
            >
              {sequence[displayIndex]}
            </span>
          )}
        </div>
      )}

      {phase === "input" && (
        <form className="flex w-full flex-col gap-4" onSubmit={handleSubmit}>
          <label
            htmlFor="digit-span-answer"
            className="text-center text-xl font-semibold"
          >
            {mode === "forward"
              ? "Type the numbers in the same order."
              : "Type the numbers in reverse order."}
          </label>
          <input
            id="digit-span-answer"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={answer}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, "");
              answerRef.current = digits;
              setAnswer(digits);
            }}
            className="min-h-16 w-full rounded-xl border-2 border-slate-500 bg-white px-4 text-center text-3xl font-bold tracking-widest text-slate-950 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
            aria-label="Enter the digit sequence"
          />
          <button
            type="submit"
            className="min-h-16 rounded-xl border-2 border-sky-950 bg-sky-800 px-8 text-2xl font-bold text-white hover:bg-sky-900 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
          >
            Submit
          </button>
        </form>
      )}

      {phase === "feedback" && (
        <p
          role="status"
          className={`text-3xl font-bold ${
            feedback === "Correct" ? "text-green-800" : "text-red-800"
          }`}
        >
          {feedback}
        </p>
      )}
    </section>
  );
}
