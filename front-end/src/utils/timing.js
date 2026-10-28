/**
 * Returns the current high-resolution time in milliseconds.
 *
 * @returns {number} The current timestamp from the performance clock.
 */
export function now() {
  return performance.now();
}

/**
 * Creates a stopwatch with total and per-lap timing.
 *
 * @returns {{ start: () => void, lap: () => number, elapsed: () => number, reset: () => void }} Stopwatch controls.
 */
export function createStopwatch() {
  let startedAt = null;
  let lastLapAt = null;
  const start = () => {
    startedAt = now();
    lastLapAt = startedAt;
  };

  return {
    start,
    lap() {
      if (lastLapAt === null) {
        start();
        return 0;
      }

      const current = now();
      const duration = current - lastLapAt;
      lastLapAt = current;
      return duration;
    },
    elapsed() {
      return startedAt === null ? 0 : now() - startedAt;
    },
    reset() {
      startedAt = null;
      lastLapAt = null;
    },
  };
}

/**
 * Waits for the requested number of milliseconds.
 *
 * @param {number} ms Duration to wait.
 * @returns {Promise<void>} A promise that resolves after the delay.
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Starts a one-second countdown.
 *
 * @param {number} seconds Initial number of seconds.
 * @param {(secondsLeft: number) => void} onTick Called immediately and once per second.
 * @param {() => void} onDone Called when the countdown reaches zero.
 * @returns {() => void} Cancels the countdown.
 */
export function createCountdown(seconds, onTick, onDone) {
  let secondsLeft = Math.max(0, Math.ceil(seconds));
  let timer = null;
  let active = true;

  const cancel = () => {
    active = false;
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };

  onTick(secondsLeft);
  if (secondsLeft === 0) {
    active = false;
    onDone();
    return cancel;
  }

  timer = setInterval(() => {
    if (!active) {
      return;
    }

    secondsLeft -= 1;
    onTick(secondsLeft);

    if (secondsLeft === 0) {
      active = false;
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
      onDone();
    }
  }, 1000);

  return cancel;
}

/**
 * Returns a random integer between the inclusive bounds.
 *
 * @param {number} min Inclusive lower bound.
 * @param {number} max Inclusive upper bound.
 * @returns {number} A random integer in the requested range.
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Returns a uniformly shuffled copy of an array.
 *
 * @template T
 * @param {T[]} array Values to shuffle.
 * @returns {T[]} A shuffled copy of the input.
 */
export function shuffle(array) {
  const shuffled = [...array];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

/**
 * Picks distinct random items from an array.
 *
 * @template T
 * @param {T[]} array Values to choose from.
 * @param {number} count Number of distinct items to return.
 * @returns {T[]} Randomly selected items.
 */
export function pickRandom(array, count) {
  return shuffle(array).slice(0, count);
}

/**
 * Formats milliseconds as seconds with one decimal place.
 *
 * @param {number} ms Duration in milliseconds.
 * @returns {string} Formatted duration, such as "12.3 s".
 */
export function formatSeconds(ms) {
  return `${(ms / 1000).toFixed(1)} s`;
}