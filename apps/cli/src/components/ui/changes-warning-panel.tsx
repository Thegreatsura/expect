import type { DiffStats } from "@browser-tester/supervisor";
import { Box, Text } from "ink";
import { useColors } from "../theme-context.js";
import { formatDiffStats } from "../../utils/format-diff-stats.js";

interface ChangesWarningPanelProps {
  title: string;
  detail: string;
  diffStats: DiffStats | null | undefined;
  riskAreas?: string[];
  tone?: "warning" | "danger";
}

export const ChangesWarningPanel = ({
  title,
  detail,
  diffStats,
  riskAreas = [],
  tone = "warning",
}: ChangesWarningPanelProps) => {
  const COLORS = useColors();
  const panelColor = tone === "danger" ? COLORS.RED : COLORS.YELLOW;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={panelColor}
      paddingX={1}
      marginTop={1}
    >
      <Text color={panelColor} bold>
        {title}
      </Text>
      <Text color={COLORS.DIM}>{formatDiffStats(diffStats)}</Text>
      <Text color={COLORS.DIM}>{detail}</Text>
      {riskAreas.length > 0 ? (
        <Text color={COLORS.DIM}>
          Risk areas: <Text color={COLORS.TEXT}>{riskAreas.join(", ")}</Text>
        </Text>
      ) : null}
    </Box>
  );
};
