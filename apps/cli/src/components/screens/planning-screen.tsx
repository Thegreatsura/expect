import { useEffect, useState } from "react";
import { Box, Text } from "ink";
import figures from "figures";
import { Spinner } from "../ui/spinner.js";
import { useColors } from "../theme-context.js";
import { RuledBox } from "../ui/ruled-box.js";
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
    <Box flexDirection="column" width="100%" paddingY={1}>
      {selectedContext ? (
        <Box paddingX={1}>
          <Text color={COLORS.DIM}>{selectedContext.label}</Text>
        </Box>
      ) : null}
      <RuledBox color={COLORS.BORDER}>
        <Text color={COLORS.DIM}>{flowInstruction}</Text>
      </RuledBox>

      <Box marginTop={1} paddingX={1}>
        <Spinner />
        <Text color={COLORS.DIM}>{` Generating plan${figures.ellipsis} ${formatElapsedTime(elapsed)}`}</Text>
      </Box>
    </Box>
  );
};
