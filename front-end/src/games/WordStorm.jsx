import { useEffect, useRef, useState } from "react";
import { createCountdown, createStopwatch, randomInt } from "../utils/timing.js";

const GAME_DURATION_SECONDS = 30;
const LETTERS = ["F", "A", "S", "T"];

export default function WordStorm({ onComplete }) {
  const [letter] = useState(
    () => LETTERS[randomInt(0, LETTERS.length - 1)],
  );
  const [secondsRemaining, setSecondsRemaining] = useState(
    GAME_DURATION_SECONDS,
  );
  const [input, setInput] = useState("");
  const [words, setWords] = useState([]);
  const [repeatCount, setRepeatCount] = useState(0);
  const [invalidCount, setInvalidCount] = useState(0);
  const [message, setMessage] = useState(
    `Type words that start with ${letter}.`,
  );
  const inputRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  const stopwatchRef = useRef(null);
  const wordsRef = useRef([]);
  const repeatCountRef = useRef(0);
  const invalidCountRef = useRef(0);
  const firstWordTimeRef = useRef(null);
  const completedRef = useRef(false);
  const mountedRef = useRef(false);
  const cancelCountdownRef = useRef(null);

  onCompleteRef.current = onComplete;

  if (stopwatchRef.current === null) {
    stopwatchRef.current = createStopwatch();
  }

  useEffect(() => {
    mountedRef.current = true;
    stopwatchRef.current.start();
    inputRef.current?.focus();
    cancelCountdownRef.current = createCountdown(
      GAME_DURATION_SECONDS,
      setSecondsRemaining,
      () => {
        if (!mountedRef.current || completedRef.current) {
          return;
        }

        completedRef.current = true;
        setMessage(`Time is up. You found ${wordsRef.current.length} words.`);
        inputRef.current?.blur();
        onCompleteRef.current({
          letter,
          wordCount: wordsRef.current.length,
          words: [...wordsRef.current],
          timeToFirstWord: firstWordTimeRef.current,
          repeatCount: repeatCountRef.current,
          invalidCount: invalidCountRef.current,
        });
      },
    );

    return () => {
      mountedRef.current = false;
      cancelCountdownRef.current?.();
      cancelCountdownRef.current = null;
    };
  }, [letter]);

  function handleSubmit(event) {
    event.preventDefault();
    if (!mountedRef.current || completedRef.current) {
      return;
    }

    const word = input.trim().toLowerCase();
    const acceptedWords = wordsRef.current;

    if (acceptedWords.includes(word)) {
      repeatCountRef.current += 1;
      setRepeatCount(repeatCountRef.current);
      setMessage("You already said that.");
    } else if (
      !/^[a-z]{2,}$/.test(word) ||
      !word.startsWith(letter.toLowerCase())
    ) {
      invalidCountRef.current += 1;
      setInvalidCount(invalidCountRef.current);
      setMessage(`Please enter a word of letters starting with ${letter}.`);
    } else {
      // Words are not checked against a dictionary.
      if (acceptedWords.length === 0) {
        firstWordTimeRef.current = stopwatchRef.current.elapsed();
      }

      wordsRef.current = [...acceptedWords, word];
      setWords(wordsRef.current);
      setMessage(`Added "${word}". Keep going!`);
    }

    setInput("");
    inputRef.current?.focus();
  }

  return (
    <section className="flex w-full max-w-2xl flex-col items-center gap-5 px-4">
      <p aria-live="polite" className="min-h-8 text-center text-xl font-semibold">
        {message}
      </p>
      <p
        aria-label={`Starting letter ${letter}`}
        className="text-8xl font-extrabold leading-none text-slate-900 sm:text-9xl"
      >
        {letter}
      </p>
      <p className="text-2xl font-bold text-sky-800" aria-live="off">
        Time left: {secondsRemaining} seconds
      </p>
      <form className="flex w-full flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="word-storm-input">
          Enter a word starting with {letter}
        </label>
        <input
          ref={inputRef}
          id="word-storm-input"
          type="text"
          autoComplete="off"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={secondsRemaining === 0}
          className="min-h-16 w-full rounded-xl border-2 border-slate-500 bg-white px-4 text-2xl text-slate-900 placeholder:text-slate-500 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-800 disabled:bg-slate-200"
          placeholder="Type a word"
        />
        <button
          type="submit"
          disabled={secondsRemaining === 0}
          className="min-h-16 rounded-xl border-2 border-sky-900 bg-sky-800 px-6 text-xl font-bold text-white hover:bg-sky-900 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-800 disabled:cursor-not-allowed disabled:bg-slate-500"
        >
          Add word
        </button>
      </form>
      <p className="text-lg font-semibold">Words found: {words.length}</p>
      <ul
        aria-label="Words entered"
        className="flex min-h-20 w-full flex-wrap gap-3 rounded-xl border-2 border-slate-300 bg-slate-50 p-4"
      >
        {words.map((word) => (
          <li
            key={word}
            className="flex min-h-12 items-center rounded-lg border border-green-800 bg-green-100 px-4 text-lg font-medium text-green-950"
          >
            {word}
          </li>
        ))}
      </ul>
      <p className="text-base text-slate-700">
        Repeats: {repeatCount}. Invalid entries: {invalidCount}.
      </p>
    </section>
  );
}
