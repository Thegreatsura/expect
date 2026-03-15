import { useEffect, useState } from "react";
import { Box, Text } from "ink";
import InkSpinner from "ink-spinner";
import { ScreenHeading } from "../ui/screen-heading.js";
import { useColors } from "../theme-context.js";
import { useAppStore } from "../../store.js";
import { formatElapsedTime } from "../../utils/format-elapsed-time.js";
import { TESTING_TIMER_UPDATE_INTERVAL_MS } from "../../constants.js";
import type { TestAction } from "../../utils/browser-agent.js";

const ACTION_LABELS: Record<TestAction, string> = {
  "test-unstaged": "Test current changes",
  "test-branch": "Test entire branch",
  "select-commit": "Test commit",
};

const PLANNING_PHASES = [
  "Analyzing git diff and changed files...",
  "Reading modified source files...",
  "Building scope-aware context...",
  "Identifying affected routes and components...",
  "Generating browser test steps...",
  "Validating test plan against codebase...",
];

const PHASE_DURATION_MS = 4000;

export const PlanningScreen = () => {
  const COLORS = useColors();
  const flowInstruction = useAppStore((state) => state.flowInstruction);
  const testAction = useAppStore((state) => state.testAction);
  const [startTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, TESTING_TIMER_UPDATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [startTime]);

  const phaseIndex = Math.min(
    Math.floor(elapsed / PHASE_DURATION_MS),
    PLANNING_PHASES.length - 1
  );

  return (
    <Box flexDirection="column" width="100%" paddingX={1} paddingY={1}>
      <ScreenHeading
        title={
          testAction ? ACTION_LABELS[testAction] : "Generating browser plan"
        }
        subtitle={formatElapsedTime(elapsed)}
      />

      <Box
        marginTop={1}
        borderStyle="round"
        borderColor={COLORS.BORDER}
        paddingX={2}
      >
        <Text color={COLORS.DIM}>{flowInstruction}</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        {PLANNING_PHASES.map((phase, index) => (
          <Text key={phase}>
            {index < phaseIndex ? (
              <Text color={COLORS.DIM}>
                <Text color={COLORS.GREEN}>{"  ✓ "}</Text>
                {phase}
              </Text>
            ) : index === phaseIndex ? (
              <Text color={COLORS.DIM}>
                <Text color={COLORS.SELECTION}>
                  {"  "}
                  <InkSpinner type="dots" />{" "}
                </Text>
                {phase}
              </Text>
            ) : (
              <Text color={COLORS.DIM}>
                {"    "}
                {phase}
              </Text>
            )}
          </Text>
        ))}
      </Box>
    </Box>
  );
};
