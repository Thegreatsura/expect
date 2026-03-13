import { useEffect, useState } from "react";
import { Box, Text } from "ink";
import { COLORS } from "./constants.js";

const RESOLVE_MS = 5;
const SHIMMER_INTERVAL_MS = 15;
const THINKING_CHARS = ["◇", "◆", "◇", "◆"];

type Result = "pass" | "fail" | "skip";
type Cell = Result | null | "empty";
type SlotState = "idle" | "thinking" | "resolved";

const GRID_COLUMNS = 10;
const GRID: Cell[] = [
  "fail",  "skip",  "pass",  "empty", "empty", "empty", "empty", "empty", "empty", "empty",
  "pass",  "pass",  "pass",  "fail",  "pass",  "skip",  "pass",  "pass",  "pass",  "pass",
  "pass",  null,    null,    null,    null,    null,    null,    null,    null,    "skip",
  "fail",  null,    null,    null,    null,    null,    null,    null,    null,    "pass",
  "skip",  null,    null,    null,    null,    null,    null,    null,    null,    "fail",
  "pass",  "pass",  "pass",  "pass",  "skip",  "fail",  "pass",  "pass",  "pass",  "pass",
];

const THINK_DURATION_MS: Record<Result, number> = {
  pass: 20,
  fail: 40,
  skip: 15,
};

const RESULT_ICON: Record<Result, string> = {
  pass: "✓",
  fail: "✗",
  skip: "–",
};

const COLOR_SHADES: Record<Result, string[]> = {
  pass: ["#2ecc71", "#34d058", "#43e067"],
  fail: ["#ff3b30", "#e8362c", "#ff5147"],
  skip: ["#e5c07b", "#d4b06a", "#f0cb86"],
};

const getColorForIndex = (cell: Result, index: number): string =>
  COLOR_SHADES[cell][index % COLOR_SHADES[cell].length];

const findNextResultIndex = (from: number): number => {
  for (let index = from; index < GRID.length; index++) {
    if (GRID[index] !== null && GRID[index] !== "empty") return index;
  }
  return GRID.length;
};

export const ColoredLogo = () => {
  const [activeIndex, setActiveIndex] = useState(() => findNextResultIndex(0));
  const [slotState, setSlotState] = useState<SlotState>("thinking");
  const [shimmerFrame, setShimmerFrame] = useState(0);

  useEffect(() => {
    if (activeIndex >= GRID.length) return;
    if (slotState !== "thinking") return;

    const timer = setInterval(() => {
      setShimmerFrame((previous) => (previous + 1) % THINKING_CHARS.length);
    }, SHIMMER_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [activeIndex, slotState]);

  useEffect(() => {
    if (activeIndex >= GRID.length) return;
    const cell = GRID[activeIndex];
    if (cell === null || cell === "empty") return;

    if (slotState === "thinking") {
      const base = THINK_DURATION_MS[cell];
      const jitter = base * 0.4 * (Math.random() - 0.5);
      const timer = setTimeout(() => setSlotState("resolved"), base + jitter);
      return () => clearTimeout(timer);
    }

    if (slotState === "resolved") {
      const timer = setTimeout(() => {
        setActiveIndex(findNextResultIndex(activeIndex + 1));
        setSlotState("thinking");
        setShimmerFrame(0);
      }, RESOLVE_MS);
      return () => clearTimeout(timer);
    }
  }, [activeIndex, slotState]);

  const rows = Array.from({ length: Math.ceil(GRID.length / GRID_COLUMNS) }, (_, rowIndex) =>
    GRID.slice(rowIndex * GRID_COLUMNS, (rowIndex + 1) * GRID_COLUMNS),
  );

  return (
    <Box flexDirection="column">
      {rows.map((row, rowIndex) => (
        <Box key={rowIndex} flexDirection="row" gap={1}>
          {row.map((cell, colIndex) => {
            const index = rowIndex * GRID_COLUMNS + colIndex;

            if (cell === "empty") {
              return <Text key={index}> </Text>;
            }

            if (cell === null) {
              return (
                <Text key={index} color={COLORS.DIM}>
                  ·
                </Text>
              );
            }

            const done = activeIndex >= GRID.length;

            if (done || index < activeIndex) {
              return (
                <Text key={index} color={getColorForIndex(cell, index)}>
                  {RESULT_ICON[cell]}
                </Text>
              );
            }

            if (index === activeIndex && slotState === "thinking") {
              return (
                <Text key={index} color={getColorForIndex(cell, index)}>
                  {THINKING_CHARS[shimmerFrame]}
                </Text>
              );
            }

            return (
              <Text key={index} color={COLORS.DIM}>
                ·
              </Text>
            );
          })}
        </Box>
      ))}
    </Box>
  );
};
