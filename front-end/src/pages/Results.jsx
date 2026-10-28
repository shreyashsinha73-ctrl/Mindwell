import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "../components/Button.jsx";
import mentalHealthQuotes from "../data/mentalHealthQuotes.js";

const LAST_QUOTE_KEY = "mindwell.lastQuote";

function chooseMentalHealthQuoteIndex() {
  if (mentalHealthQuotes.length === 0) {
    return -1;
  }

  const randomIndex = () => Math.floor(Math.random() * mentalHealthQuotes.length);

  try {
    const storedValue = window.sessionStorage.getItem(LAST_QUOTE_KEY);
    const storedIndex = storedValue === null ? -1 : Number(storedValue);
    const previousIndex =
      Number.isInteger(storedIndex) &&
      storedIndex >= 0 &&
      storedIndex < mentalHealthQuotes.length
        ? storedIndex
        : -1;
    const availableCount =
      mentalHealthQuotes.length > 1
        ? mentalHealthQuotes.length - 1
        : mentalHealthQuotes.length;
    let index = Math.floor(Math.random() * availableCount);

    if (
      mentalHealthQuotes.length > 1 &&
      previousIndex >= 0 &&
      index >= previousIndex
    ) {
      index += 1;
    }

    return index;
  } catch {
    return randomIndex();
  }
}

// Placeholder wording; category messages must be reviewed by a clinician.
const CATEGORY_INFO = {
  healthy: {
    label: "Healthy",
    icon: "🌿",
    message: "Your answers today were in the strongest range.",
    classes: "border-green-800 bg-green-50 text-green-950",
  },
  "low risk": {
    label: "Low risk",
    icon: "🌱",
    message: "Your answers today were mostly strong, with a few areas that were harder.",
    classes: "border-lime-800 bg-lime-50 text-lime-950",
  },
  "moderate risk": {
    label: "Moderate risk",
    icon: "💬",
    message:
      "Some games today were harder for you. It may help to mention this to a doctor, especially if you have noticed changes in your memory.",
    classes: "border-amber-800 bg-amber-50 text-amber-950",
  },
  "high risk": {
    label: "High risk",
    icon: "🩺",
    message:
      "Many games today were hard. We suggest speaking to a doctor about how your memory and thinking have been.",
    classes: "border-orange-800 bg-orange-50 text-orange-950",
  },
  vulnerable: {
    label: "Vulnerable",
    icon: "🤝",
    message:
      "Most games today were very hard. Please speak to a doctor soon so they can look into this properly.",
    classes: "border-red-800 bg-red-50 text-red-950",
  },
};

const GAME_NAMES = {
  patternRecall: "Pattern Recall",
  starConnect: "Star Connect",
  digitSpan: "Digit Span",
  blockBuilder: "Block Builder",
  targetTap: "Target Tap",
  wordStorm: "Word Storm",
  memoryRecall: "Memory Recall",
  clockMaster: "Clock Master",
};

const DEFAULT_DISCLAIMER =
  "This is a screening indicator based on game performance. It is not a medical diagnosis. Please speak to a doctor if you have any concerns.";

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const headingRef = useRef(null);
  const [quoteIndex] = useState(chooseMentalHealthQuoteIndex);
  const quote = mentalHealthQuotes[quoteIndex] ?? "";
  const session = location.state?.session;

  useEffect(() => {
    if (quoteIndex < 0) {
      return;
    }

    try {
      window.sessionStorage.setItem(LAST_QUOTE_KEY, String(quoteIndex));
    } catch {
      // Quote selection still works when session storage is unavailable.
    }
  }, [quoteIndex]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [session]);

  if (!session) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center gap-6 px-6 py-10 text-center">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-4xl font-bold text-slate-950 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-blue-800"
        >
          We couldn't find your result.
        </h1>
        <Button variant="secondary" onClick={() => navigate("/")}>
          Back to start
        </Button>
      </div>
    );
  }

  const score = Number.isFinite(session.score) ? Math.round(session.score) : 0;
  const categoryKey = session.category?.toLowerCase();
  const category = CATEGORY_INFO[categoryKey] ?? {
    label: session.category || "Result",
    icon: "ℹ️",
    message: "Your results are ready to review.",
    classes: "border-slate-600 bg-slate-100 text-slate-950",
  };
  const gameScores =
    session.game_scores && typeof session.game_scores === "object"
      ? Object.entries(session.game_scores)
      : [];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center gap-7 px-6 py-10 text-center">
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-4xl font-bold text-slate-950 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-blue-800 sm:text-5xl"
      >
        Your results
      </h1>

      <p className="text-5xl font-extrabold text-slate-950 sm:text-6xl">
        {score} out of 100
      </p>

      <section
        aria-label={`Category: ${category.label}`}
        className={`w-full rounded-2xl border-4 p-6 ${category.classes}`}
      >
        <p className="flex items-center justify-center gap-3 text-3xl font-bold">
          <span role="img" aria-label={category.label} className="text-4xl">
            {category.icon}
          </span>
          <span>{category.label}</span>
        </p>
        <p className="mt-4 text-xl leading-relaxed">{category.message}</p>
      </section>

      <p className="w-full rounded-xl border-2 border-slate-500 bg-slate-100 p-5 text-left text-lg leading-relaxed text-slate-950">
        {session.disclaimer || DEFAULT_DISCLAIMER}
      </p>

      <details className="w-full rounded-xl border-2 border-slate-400 bg-white p-5 text-left">
        <summary className="min-h-12 cursor-pointer py-2 text-xl font-bold text-slate-950 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-800">
          See each game
        </summary>
        <ul className="mt-4 space-y-5">
          {gameScores.map(([gameId, gameScore]) => {
            const numericScore = Number.isFinite(gameScore)
              ? Math.max(0, Math.min(100, gameScore))
              : 0;
            return (
              <li key={gameId} className="space-y-2">
                <div className="flex items-center justify-between gap-4 text-lg font-semibold text-slate-950">
                  <span>{GAME_NAMES[gameId] || gameId}</span>
                  <span>{Math.round(numericScore)} out of 100</span>
                </div>
                <div
                  role="img"
                  aria-label={`${GAME_NAMES[gameId] || gameId}: ${Math.round(numericScore)} out of 100`}
                  className="h-4 w-full overflow-hidden rounded-full border-2 border-slate-600 bg-slate-100"
                >
                  <div
                    className="h-full bg-sky-800"
                    style={{ width: `${numericScore}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </details>

      {quote && (
        <figure className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 px-6 py-8 text-center">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
            A thought for you
          </h2>
          <blockquote className="font-quote text-2xl font-medium italic leading-relaxed text-slate-950 sm:text-3xl">
            <span aria-hidden="true" className="font-quote text-[1.5em] text-sky-700">
              “
            </span>
            {quote}
            <span aria-hidden="true" className="font-quote text-[1.5em] text-sky-700">
              ”
            </span>
          </blockquote>
        </figure>
      )}

      <div className="flex w-full flex-col justify-center gap-4 sm:flex-row">
        <Button onClick={() => navigate("/assessment")}>
          Take the test again
        </Button>
        <Button variant="secondary" onClick={() => navigate("/")}>
          Back to start
        </Button>
      </div>
    </div>
  );
}