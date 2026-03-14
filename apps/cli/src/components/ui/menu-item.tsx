import { Text } from "ink";
import { useColors } from "../theme-context.js";
import type { DiffStats } from "@browser-tester/supervisor";

interface MenuItemProps {
  label: string;
  detail: string;
  isSelected: boolean;
  recommended?: boolean;
  hint?: string;
  diffStats?: DiffStats | null;
}

export const MenuItem = ({
  label,
  detail,
  isSelected,
  recommended,
  hint,
  diffStats,
}: MenuItemProps) => {
  const COLORS = useColors();
  return (
    <Text>
      <Text color={isSelected ? COLORS.ORANGE : COLORS.DIM}>{isSelected ? "❯ " : "  "}</Text>
      <Text color={isSelected ? undefined : COLORS.DIM} bold={isSelected}>
        {label}
      </Text>
      {isSelected && diffStats ? (
        <Text>
          {" "}
          <Text color={COLORS.GREEN}>+{diffStats.additions}</Text>{" "}
          <Text color={COLORS.RED}>-{diffStats.deletions}</Text>
        </Text>
      ) : detail ? (
        <Text color={COLORS.DIM}> {detail}</Text>
      ) : null}
      {isSelected && recommended && <Text> (recommended)</Text>}
      {hint && <Text color={COLORS.DIM}> ({hint})</Text>}
    </Text>
  );
};
