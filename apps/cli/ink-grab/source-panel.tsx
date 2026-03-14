import { Box, Text } from "ink";
import type { ElementInfo, ElementSourceInfo } from "element-source";

const formatLocation = (source: ElementSourceInfo): string => {
  const parts = [source.filePath];
  if (source.lineNumber !== null) parts.push(String(source.lineNumber));
  if (source.columnNumber !== null) parts.push(String(source.columnNumber));
  return parts.join(":");
};

interface SourcePanelProps {
  info: ElementInfo;
  copied: boolean;
}

export const SourcePanel = ({ info, copied }: SourcePanelProps) => {
  return (
    <Box flexDirection="column">
      <Text>
        <Text bold>{info.componentName ?? info.tagName}</Text>
        {info.source ? <Text dimColor> {formatLocation(info.source)}</Text> : null}
      </Text>
      {info.stack.map((frame, index) => (
        <Text key={index} dimColor>
          {"  "}in {frame.componentName ?? formatLocation(frame)} ({formatLocation(frame)})
        </Text>
      ))}
      <Text dimColor>
        {copied ? <Text color="green">Copied!</Text> : "c copy"}
        {" · esc exit"}
      </Text>
    </Box>
  );
};
