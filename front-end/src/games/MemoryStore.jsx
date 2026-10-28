import { useEffect, useRef, useState } from "react";
import { pickRandom } from "../utils/timing.js";

const ITEM_POOL = [
  { emoji: "🔑", label: "key" },
  { emoji: "📚", label: "books" },
  { emoji: "💡", label: "light bulb" },
  { emoji: "🍎", label: "apple" },
  { emoji: "🏠", label: "house" },
  { emoji: "🚗", label: "car" },
  { emoji: "⏰", label: "alarm clock" },
  { emoji: "🎸", label: "guitar" },
  { emoji: "⚽", label: "soccer ball" },
  { emoji: "💻", label: "laptop" },
];

export default function MemoryStore({ onComplete, setShared }) {
  const [items] = useState(() => pickRandom(ITEM_POOL, 5));
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [showItem, setShowItem] = useState(true);
  const [finishedSequence, setFinishedSequence] = useState(false);
  const onCompleteRef = useRef(onComplete);
  const setSharedRef = useRef(setShared);
  const visibleIndexRef = useRef(0);
  const timerRef = useRef(null);
  const mountedRef = useRef(false);
  const sharedSavedRef = useRef(false);
  const completedRef = useRef(false);

  onCompleteRef.current = onComplete;
  setSharedRef.current = setShared;

  useEffect(() => {
    mountedRef.current = true;

    if (!sharedSavedRef.current) {
      sharedSavedRef.current = true;
      setSharedRef.current("memoryItems", items);
    }

    function showNext() {
      if (!mountedRef.current) {
        return;
      }

      if (visibleIndexRef.current < items.length - 1) {
        setShowItem(false);
        timerRef.current = setTimeout(() => {
          if (!mountedRef.current) {
            return;
          }
          visibleIndexRef.current += 1;
          setVisibleIndex(visibleIndexRef.current);
          setShowItem(true);
          timerRef.current = setTimeout(showNext, 1500);
        }, 300);
        return;
      }

      setFinishedSequence(true);
      timerRef.current = setTimeout(() => {
        if (!mountedRef.current || completedRef.current) {
          return;
        }

        completedRef.current = true;
        onCompleteRef.current({ itemsShown: 5 });
      }, 1000);
    }

    timerRef.current = setTimeout(showNext, 1500);

    return () => {
      mountedRef.current = false;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [items]);

  return (
    <section className="flex min-h-80 w-full flex-col items-center justify-center gap-8 px-4">
      <p aria-live="polite" className="text-center text-xl font-semibold">
        {finishedSequence ? "Let's continue..." : "Remember these 5 items."}
      </p>
      <div className="flex min-h-48 items-center justify-center">
        {showItem && !finishedSequence && (
          <span
            role="img"
            aria-label={items[visibleIndex].label}
            className="text-[8rem] leading-none"
          >
            {items[visibleIndex].emoji}
          </span>
        )}
      </div>
    </section>
  );
}
