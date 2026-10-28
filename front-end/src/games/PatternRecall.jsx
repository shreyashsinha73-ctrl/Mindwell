import { useCallback, useEffect, useRef, useState } from "react";
import { createStopwatch, randomInt } from "../utils/timing.js";

const MAX_LEVEL = 9;
const FLASH_DURATION_MS = 800;
const FLASH_GAP_MS = 250;
const TAP_FLASH_MS = 200;

function createSequence(length) {
  const sequence = [];

  while (sequence.length < length) {
    const previous = sequence[sequence.length - 1];
    let index = randomInt(0, 8);

    if (index === previous) {
      index = (index + 1 + randomInt(0, 7)) % 9;
    }

    sequence.push(index);
  }

  return sequence;
}

export default function PatternRecall({ onComplete }) {
  const [level, setLevel] = useState(3);
  const [sequence, setSequence] = useState(() => createSequence(3));
  const [phase, setPhase] = useState("watching");
  const [activeIndex, setActiveIndex] = useState(null);
  const [message, setMessage] = useState("Watch the sequence carefully.");
  const onCompleteRef = useRef(onComplete);
  const levelRef = useRef(3);
  const sequenceRef = useRef(sequence);
  const phaseRef = useRef("watching");
  const sequenceProgressRef = useRef(0);
  const levelsClearedRef = useRef(0);
  const finalLevelRef = useRef(0);
  const reactionTimesRef = useRef([]);
  const stopwatchRef = useRef(null);
  const completedRef = useRef(false);
  const mountedRef = useRef(false);
  const playbackTimerRef = useRef(null);
  const tapTimerRef = useRef(null);

  onCompleteRef.current = onComplete;
  sequenceRef.current = sequence;

  if (stopwatchRef.current === null) {
    stopwatchRef.current = createStopwatch();
  }

  const changePhase = useCallback((nextPhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }, []);

  const finish = useCallback((successful) => {
    if (!mountedRef.current || completedRef.current) {
      return;
    }

    completedRef.current = true;
    if (playbackTimerRef.current !== null) {
      clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    if (tapTimerRef.current !== null) {
      clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;
    }

    changePhase("finished");
    setActiveIndex(null);
    setMessage(
      successful
        ? "Level 9 cleared! Excellent work."
        : `Game over. You cleared ${levelsClearedRef.current} levels.`,
    );

    const reactionTimes = reactionTimesRef.current;
    onCompleteRef.current({
      finalLevel: finalLevelRef.current,
      reactionTime:
        reactionTimes.length === 0
          ? 0
          : reactionTimes.reduce((total, duration) => total + duration, 0) /
            reactionTimes.length,
      levelsCleared: levelsClearedRef.current,
    });
  }, [changePhase]);

  useEffect(() => {
    mountedRef.current = true;

    if (phase === "watching") {
      let step = 0;
      setMessage("Watch the sequence carefully.");
      setActiveIndex(sequence[0]);

      const advance = () => {
        if (!mountedRef.current || completedRef.current) {
          return;
        }

        step += 1;
        if (step >= sequence.length) {
          setActiveIndex(null);
          sequenceProgressRef.current = 0;
          stopwatchRef.current.start();
          changePhase("input");
          setMessage("Now repeat the sequence.");
          return;
        }

        setActiveIndex(null);
        playbackTimerRef.current = setTimeout(() => {
          if (!mountedRef.current || completedRef.current) {
            return;
          }
          setActiveIndex(sequence[step]);
          playbackTimerRef.current = setTimeout(advance, FLASH_DURATION_MS);
        }, FLASH_GAP_MS);
      };

      playbackTimerRef.current = setTimeout(advance, FLASH_DURATION_MS);
    }

    if (phase === "cleared") {
      playbackTimerRef.current = setTimeout(() => {
        if (!mountedRef.current || completedRef.current) {
          return;
        }

        if (levelRef.current >= MAX_LEVEL) {
          finish(true);
          return;
        }

        const nextLevel = levelRef.current + 1;
        const nextSequence = createSequence(nextLevel);
        levelRef.current = nextLevel;
        sequenceRef.current = nextSequence;
        setLevel(nextLevel);
        setSequence(nextSequence);
        changePhase("watching");
      }, 1500);
    }

    return () => {
      if (playbackTimerRef.current !== null) {
        clearTimeout(playbackTimerRef.current);
        playbackTimerRef.current = null;
      }
    };
  }, [phase, sequence, changePhase, finish]);

  useEffect(
    () => () => {
      mountedRef.current = false;
      if (playbackTimerRef.current !== null) {
        clearTimeout(playbackTimerRef.current);
        playbackTimerRef.current = null;
      }
      if (tapTimerRef.current !== null) {
        clearTimeout(tapTimerRef.current);
        tapTimerRef.current = null;
      }
    },
    [],
  );

  function handleTap(index) {
    if (!mountedRef.current || completedRef.current || phaseRef.current !== "input") {
      return;
    }

    reactionTimesRef.current.push(stopwatchRef.current.lap());
    setActiveIndex(index);
    if (tapTimerRef.current !== null) {
      clearTimeout(tapTimerRef.current);
    }
    tapTimerRef.current = setTimeout(() => {
      if (mountedRef.current && !completedRef.current) {
        setActiveIndex(null);
      }
      tapTimerRef.current = null;
    }, TAP_FLASH_MS);

    const step = sequenceProgressRef.current;
    if (index !== sequenceRef.current[step]) {
      finish(false);
      return;
    }

    sequenceProgressRef.current += 1;
    if (sequenceProgressRef.current === sequenceRef.current.length) {
      levelsClearedRef.current += 1;
      finalLevelRef.current = levelRef.current;
      setMessage(`Level ${levelRef.current} cleared!`);
      changePhase("cleared");
    }
  }

  return (
    <section className="flex w-full max-w-xl flex-col items-center gap-5 px-4">
      <p aria-live="polite" className="min-h-8 text-center text-xl font-semibold">
        {message}
      </p>
      <p className="text-xl font-bold">Level {level}</p>
      <div className="grid w-full max-w-[420px] grid-cols-3 gap-3">
        {Array.from({ length: 9 }, (_, index) => {
          const isActive = activeIndex === index;

          return (
            <button
              key={index}
              type="button"
              disabled={phase !== "input"}
              onClick={() => handleTap(index)}
              aria-label={`Square ${index + 1}${isActive ? ", highlighted" : ""}`}
              className={`aspect-square min-h-16 min-w-16 rounded-xl border-2 text-xl font-bold focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-800 ${
                isActive
                  ? "border-blue-950 bg-blue-700 text-white ring-4 ring-blue-300"
                  : "border-slate-500 bg-slate-200 text-slate-900 hover:bg-slate-300"
              } disabled:cursor-default`}
            >
              {index + 1}
              {isActive && <span className="sr-only"> highlighted</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
