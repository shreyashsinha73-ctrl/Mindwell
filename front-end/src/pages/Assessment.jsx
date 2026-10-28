import { Component, useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/Button.jsx";
import GameShell from "../components/GameShell.jsx";
import { games } from "../games/index.js";
import { useSession } from "../hooks/useSession.js";

/**
 * Contains rendering errors from an individual game and offers a safe skip.
 */
class GameErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex w-full flex-col items-center gap-5 rounded-xl border-2 border-red-800 bg-red-50 p-6 text-center"
        >
          <p className="text-xl font-semibold text-slate-950">
            Something went wrong with this game.
          </p>
          <Button variant="secondary" onClick={this.props.onSkip}>
            Skip this game
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function Assessment() {
  const navigate = useNavigate();
  const {
    shared,
    setShared,
    recordResult,
    submit,
    status,
    error,
    reset,
  } = useSession();
  const resetRef = useRef(reset);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [finishStarted, setFinishStarted] = useState(false);
  const currentIndexRef = useRef(0);
  const completedGameRef = useRef(null);
  const mountedRef = useRef(false);
  const advanceTimeoutRef = useRef(null);
  const finishInProgressRef = useRef(false);

  resetRef.current = reset;

  useEffect(() => {
    mountedRef.current = true;
    resetRef.current();
    return () => {
      mountedRef.current = false;
      if (advanceTimeoutRef.current !== null) {
        clearTimeout(advanceTimeoutRef.current);
        advanceTimeoutRef.current = null;
      }
    };
  }, []);

  const finish = useCallback(async () => {
    if (finishInProgressRef.current) {
      return;
    }

    finishInProgressRef.current = true;
    setFinishStarted(true);
    try {
      const response = await submit();
      if (mountedRef.current && response) {
        navigate("/results", {
          replace: true,
          state: { session: response },
        });
      }
    } catch {
      // useSession exposes the user-friendly error and keeps recorded results.
    } finally {
      finishInProgressRef.current = false;
    }
  }, [navigate, submit]);

  const advance = useCallback(() => {
    if (!mountedRef.current) {
      return;
    }

    if (currentIndexRef.current >= games.length - 1) {
      void finish();
      return;
    }

    currentIndexRef.current += 1;
    setCurrentIndex(currentIndexRef.current);
    setIsComplete(false);
  }, [finish]);

  const handleComplete = useCallback(
    (metrics) => {
      const game = games[currentIndexRef.current];
      if (!mountedRef.current || !game || completedGameRef.current === game.id) {
        return;
      }

      completedGameRef.current = game.id;
      recordResult(game.id, metrics);
      setIsComplete(true);

      if (game.autoAdvance) {
        advanceTimeoutRef.current = setTimeout(() => {
          advanceTimeoutRef.current = null;
          advance();
        }, 300);
      }
    },
    [advance, recordResult],
  );

  const handleNext = useCallback(() => {
    if (advanceTimeoutRef.current !== null) {
      clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
    advance();
  }, [advance]);

  const handleSkip = useCallback(() => {
    completedGameRef.current = games[currentIndexRef.current]?.id ?? null;
    setIsComplete(true);
    handleNext();
  }, [handleNext]);

  if (status === "submitting" || finishStarted && !error && status !== "error") {
    return (
      <div
        role="status"
        className="flex min-h-screen items-center justify-center px-6 text-center text-3xl font-semibold text-slate-950"
      >
        Saving your results...
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
        <p role="alert" className="text-2xl font-semibold">
          There are no games available right now.
        </p>
        <Link
          to="/"
          className="rounded-lg text-xl font-semibold text-sky-900 underline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-blue-800"
        >
          Back to start
        </Link>
      </div>
    );
  }

  if (status === "error" || error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-10">
        <div
          role="alert"
          className="w-full max-w-xl rounded-2xl border-2 border-red-800 bg-red-50 p-6 text-center text-xl font-semibold text-slate-950"
        >
          {error || "Something went wrong. Please try again."}
        </div>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Button onClick={finish}>Try again</Button>
          <Button variant="secondary" onClick={() => navigate("/")}>
            Back to start
          </Button>
        </div>
      </div>
    );
  }

  const game = games[currentIndex];
  const GameComponent = game.Component;

  return (
    <div className="w-full">
      <GameShell
        key={game.id}
        title={game.title}
        description={game.description}
        step={currentIndex + 1}
        total={games.length}
        isComplete={isComplete}
        autoAdvance={game.autoAdvance}
        isLast={currentIndex === games.length - 1}
        onNext={handleNext}
      >
        <GameErrorBoundary key={game.id} onSkip={handleSkip}>
          <GameComponent
            key={game.id}
            onComplete={handleComplete}
            shared={shared}
            setShared={setShared}
          />
        </GameErrorBoundary>
      </GameShell>

      <div className="mx-auto flex w-full max-w-2xl justify-center px-6 pb-8">
        {confirmStop ? (
          <div
            role="group"
            aria-label="Confirm stopping the test"
            className="flex w-full flex-col items-center gap-4 rounded-xl border-2 border-amber-800 bg-amber-50 p-5 text-center"
          >
            <p className="text-lg font-semibold text-slate-950">
              Stop the test? Your answers so far won't be saved.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                variant="danger"
                onClick={() => {
                  reset();
                  navigate("/");
                }}
              >
                Yes, stop
              </Button>
              <Button
                variant="secondary"
                onClick={() => setConfirmStop(false)}
              >
                No, keep going
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="secondary"
            size="md"
            onClick={() => setConfirmStop(true)}
          >
            Stop test
          </Button>
        )}
      </div>
    </div>
  );
}