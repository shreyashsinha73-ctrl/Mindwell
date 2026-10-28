import { useEffect, useRef } from "react";
import Button from "./Button.jsx";
import ProgressBar from "./ProgressBar.jsx";

/**
 * Wraps a game with its title, description, progress, and navigation control.
 *
 * @param {{
 *   title: string,
 *   description: string,
 *   step: number,
 *   total: number,
 *   isComplete: boolean,
 *   autoAdvance: boolean,
 *   isLast: boolean,
 *   onNext: () => void,
 *   children: import("react").ReactNode
 * }} props Game presentation and navigation properties.
 * @returns {import("react").JSX.Element} The accessible game page wrapper.
 */
export default function GameShell({
  title,
  description,
  step,
  total,
  isComplete,
  autoAdvance,
  isLast,
  onNext,
  children,
}) {
  const headingRef = useRef(null);
  const nextButtonRef = useRef(null);
  const shouldFocusNextRef = useRef(false);
  const nextButtonVisible = isComplete && !autoAdvance;
  const previousVisibilityRef = useRef(nextButtonVisible);

  useEffect(() => {
    headingRef.current?.focus();
    shouldFocusNextRef.current = false;
  }, [title]);

  useEffect(() => {
    if (nextButtonVisible && !previousVisibilityRef.current) {
      shouldFocusNextRef.current = true;
    }

    previousVisibilityRef.current = nextButtonVisible;
  }, [nextButtonVisible]);

  useEffect(() => {
    if (nextButtonVisible && shouldFocusNextRef.current) {
      nextButtonRef.current?.focus();
      shouldFocusNextRef.current = false;
    }
  }, [nextButtonVisible]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center px-5 py-8 sm:px-8">
      <ProgressBar current={step} total={total} />
      <header className="mt-8 w-full text-center">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-4xl font-bold text-slate-950 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-blue-800 sm:text-5xl"
        >
          {title}
        </h1>
        <p className="mt-3 text-xl text-slate-800">{description}</p>
      </header>
      <section
        aria-label={title}
        className="mt-8 flex w-full flex-1 flex-col items-center"
      >
        {children}
      </section>
      <div className="mt-6 flex h-20 w-full items-center justify-center">
        {nextButtonVisible && (
          <Button
            ref={nextButtonRef}
            variant="success"
            onClick={onNext}
            className="min-w-48"
          >
            {isLast ? "See Results" : "Next Game"}
          </Button>
        )}
      </div>
    </div>
  );
}