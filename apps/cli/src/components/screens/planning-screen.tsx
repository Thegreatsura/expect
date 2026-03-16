import { useEffect, useState } from "react";
import { Box, Text } from "ink";
import figures from "figures";
import { Spinner } from "../ui/spinner.js";
import { TextShimmer } from "../ui/text-shimmer.js";
import { useColors } from "../theme-context.js";
import { useAppStore } from "../../store.js";
import { formatElapsedTime } from "../../utils/format-elapsed-time.js";
import { TESTING_TIMER_UPDATE_INTERVAL_MS } from "../../constants.js";

export const PlanningScreen = () => {
  const COLORS = useColors();
  const flowInstruction = useAppStore((state) => state.flowInstruction);
  const selectedContext = useAppStore((state) => state.selectedContext);
  const [startTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, TESTING_TIMER_UPDATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <Box flexDirection="column" width="100%" paddingX={1} paddingY={1}>
      <Box flexDirection="column">
        <Text color={COLORS.DIM}>{selectedContext ? selectedContext.label : "Describe what to test"}</Text>
        <Box borderStyle="round" borderColor={COLORS.BORDER} paddingX={2}>
          <Text color={COLORS.DIM}>{flowInstruction}</Text>
        </Box>
      </Box>

      <Box marginTop={1}>
        <Spinner />
        <Text> </Text>
        <TextShimmer
          text={`Generating plan${figures.ellipsis} ${formatElapsedTime(elapsed)}`}
          baseColor={COLORS.DIM}
          highlightColor={COLORS.PRIMARY}
        />
      </Box>
    </Box>
  );
};
