import { Text } from "ink";
import { COLORS, SELECTED_INDICATOR } from "./constants.js";

interface MenuItemProps {
  label: string;
  detail: string;
  isSelected: boolean;
  recommended?: boolean;
}

export const MenuItem = ({ label, detail, isSelected, recommended }: MenuItemProps) => {
  return (
    <Text>
      <Text color={isSelected ? COLORS.CYAN : COLORS.DIM}>
        {isSelected ? `${SELECTED_INDICATOR} ` : "  "}
      </Text>
      <Text color={isSelected ? COLORS.CYAN : COLORS.TEXT} bold={isSelected}>{label}</Text>
      {isSelected && detail ? <Text color={COLORS.DIM}> {detail}</Text> : null}
      {recommended && <Text color={COLORS.AMBER}> ◆ recommended</Text>}
    </Text>
  );
};
