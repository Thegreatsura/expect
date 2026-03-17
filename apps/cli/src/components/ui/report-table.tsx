import { Text } from "ink";
import { useStdoutDimensions } from "../../hooks/use-stdout-dimensions.js";

const LABEL_COL = 14;
const FIXED_CHARS = 7;

const useTableLayout = () => {
  const [columns] = useStdoutDimensions();
  const innerWidth = columns - 2;
  const valueCol = columns - LABEL_COL - FIXED_CHARS;
  return { columns, innerWidth, valueCol };
};

const wrapText = (text: string, width: number): string[] => {
  if (width <= 0) return [text];
  if (text.length <= width) return [text];
  const lines: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= width) {
      lines.push(remaining);
      break;
    }
    let breakAt = remaining.lastIndexOf(" ", width);
    if (breakAt <= 0) breakAt = width;
    lines.push(remaining.slice(0, breakAt));
    remaining = remaining.slice(breakAt).trimStart();
  }
  return lines;
};

interface TableHeaderProps {
  title: string;
  subtitle?: string;
  color: string;
  highlightColor: string;
}

export const TableHeader = ({ title, subtitle, color, highlightColor }: TableHeaderProps) => {
  const { innerWidth } = useTableLayout();

  const topBorder = "┌" + "─".repeat(innerWidth) + "┐";

  const padCenter = (text: string, width: number) => {
    const truncated = text.length > width ? text.slice(0, width) : text;
    const total = width - truncated.length;
    const left = Math.floor(total / 2);
    const right = total - left;
    return " ".repeat(left) + truncated + " ".repeat(right);
  };

  return (
    <>
      <Text color={color}>{topBorder}</Text>
      <Text color={color}>
        {"│"}
        {padCenter(title, innerWidth)}
        {"│"}
      </Text>
      {subtitle ? (
        <Text color={color}>
          {"│"}
          <Text color={highlightColor}>{padCenter(subtitle, innerWidth)}</Text>
          {"│"}
        </Text>
      ) : null}
    </>
  );
};

interface TableDividerProps {
  position?: "top" | "middle" | "bottom";
  color: string;
}

export const TableDivider = ({ position = "middle", color }: TableDividerProps) => {
  const { columns } = useTableLayout();

  const symbols = {
    top: { left: "├", mid: "┬", right: "┤" },
    middle: { left: "├", mid: "┼", right: "┤" },
    bottom: { left: "└", mid: "┴", right: "┘" },
  }[position];

  const leftSegment = "─".repeat(LABEL_COL + 2);
  const rightSegment = "─".repeat(Math.max(0, columns - LABEL_COL - 5));

  return (
    <Text color={color}>
      {symbols.left}
      {leftSegment}
      {symbols.mid}
      {rightSegment}
      {symbols.right}
    </Text>
  );
};

interface TableRowProps {
  label: string;
  value: string;
  color: string;
  labelColor?: string;
  valueColor?: string;
  selected?: boolean;
  selectedColor?: string;
}

export const TableRow = ({
  label,
  value,
  color,
  labelColor,
  valueColor,
  selected = false,
  selectedColor,
}: TableRowProps) => {
  const { valueCol } = useTableLayout();
  const paddedLabel = label.padEnd(LABEL_COL).slice(0, LABEL_COL);
  const lines = wrapText(value, valueCol);
  const effectiveLabelColor = selected
    ? (selectedColor ?? labelColor ?? color)
    : (labelColor ?? color);
  const effectiveValueColor = selected
    ? (selectedColor ?? valueColor ?? color)
    : (valueColor ?? color);

  return (
    <>
      {lines.map((line, index) => {
        const displayLabel = index === 0 ? paddedLabel : " ".repeat(LABEL_COL);
        const paddedValue = line.padEnd(valueCol).slice(0, valueCol);
        return (
          <Text key={index} color={color}>
            {"│ "}
            <Text color={effectiveLabelColor} bold={selected && index === 0}>
              {displayLabel}
            </Text>
            {" │ "}
            <Text color={effectiveValueColor}>{paddedValue}</Text>
            {" │"}
          </Text>
        );
      })}
    </>
  );
};
