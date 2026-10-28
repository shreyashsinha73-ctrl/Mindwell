import PatternRecall from "./PatternRecall.jsx";
import MemoryStore from "./MemoryStore.jsx";
import StarConnect from "./StarConnect.jsx";
import DigitSpan from "./DigitSpan.jsx";
import BlockBuilder from "./BlockBuilder.jsx";
import TargetTap from "./TargetTap.jsx";
import WordStorm from "./WordStorm.jsx";
import MemoryRecall from "./MemoryRecall.jsx";
import ClockMaster from "./ClockMaster.jsx";

// Order matters: the memory games are deliberately separated by other games.
export const games = [
  {
    id: "patternRecall",
    title: "Pattern Recall",
    description: "Watch the sequence carefully.",
    Component: PatternRecall,
    autoAdvance: false,
  },
  {
    id: "memoryStore",
    title: "Memory Store",
    description: "Remember these 5 items.",
    Component: MemoryStore,
    autoAdvance: true,
  },
  {
    id: "starConnect",
    title: "Star Connect",
    description: "Tap in order: 1, A, 2, B, 3, C...",
    Component: StarConnect,
    autoAdvance: false,
  },
  {
    id: "digitSpan",
    title: "Digit Span",
    description: "Remember the numbers you see.",
    Component: DigitSpan,
    autoAdvance: false,
  },
  {
    id: "blockBuilder",
    title: "Block Builder",
    description: "Copy the pattern on the left.",
    Component: BlockBuilder,
    autoAdvance: false,
  },
  {
    id: "targetTap",
    title: "Target Tap",
    description: "Tap the circles. Ignore other shapes.",
    Component: TargetTap,
    autoAdvance: false,
  },
  {
    id: "wordStorm",
    title: "Word Storm",
    description: "Type words that start with the letter.",
    Component: WordStorm,
    autoAdvance: false,
  },
  {
    id: "memoryRecall",
    title: "Memory Recall",
    description: "Pick the 5 items you saw earlier.",
    Component: MemoryRecall,
    autoAdvance: false,
  },
  {
    id: "clockMaster",
    title: "Clock Master",
    description: "Place the numbers and set the time.",
    Component: ClockMaster,
    autoAdvance: false,
  },
];

export default games;