import { useEffect, useRef, useState } from "react";
import { Box, Text } from "ink";

const CAROUSEL_INTERVAL_MS = 600;
const VISIBLE_COUNT = 10;

type Result = "pass" | "fail" | "skip";

const RESULT_ICON: Record<Result, string> = {
  pass: "✓",
  fail: "✗",
  skip: "–",
};

const RESULT_COLOR: Record<Result, string> = {
  pass: "greenBright",
  fail: "redBright",
  skip: "yellowBright",
};

const WEIGHTS: [Result, number][] = [
  ["pass", 6],
  ["fail", 2],
  ["skip", 1],
];

const TOTAL_WEIGHT = WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0);

const randomResult = (): Result => {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const [result, weight] of WEIGHTS) {
    roll -= weight;
    if (roll <= 0) return result;
  }
  return "pass";
};

const createInitialCells = (): Result[] =>
  Array.from({ length: VISIBLE_COUNT }, () => randomResult());

export const ColoredLogo = () => {
  const [cells, setCells] = useState(createInitialCells);
  const nextCellRef = useRef<Result>(randomResult());

  useEffect(() => {
    const timer = setInterval(() => {
      setCells((previous) => [...previous.slice(1), nextCellRef.current]);
      nextCellRef.current = randomResult();
    }, CAROUSEL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  return (
    <Box flexDirection="row" gap={1}>
      {cells.map((cell, index) => (
        <Text key={index} color={RESULT_COLOR[cell]}>
          {RESULT_ICON[cell]}
        </Text>
      ))}
    </Box>
  );
};
