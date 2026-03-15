import { useState } from "react";
import { Box, Text } from "ink";
import { Input } from "../ui/input.js";
import { useColors } from "../theme-context.js";
import { stripMouseSequences } from "../../hooks/mouse-context.js";
import type { TestAction } from "../../utils/browser-agent.js";
import { useAppStore } from "../../store.js";
import { ScreenHeading } from "../ui/screen-heading.js";
import { ErrorMessage } from "../ui/error-message.js";

const ACTION_LABELS: Record<TestAction, string> = {
  "test-unstaged": "Test current changes",
  "test-branch": "Test entire branch",
  "select-commit": "Test commit",
};

export const FlowInputScreen = () => {
  const COLORS = useColors();
  const testAction = useAppStore((state) => state.testAction);
  const selectedCommit = useAppStore((state) => state.selectedCommit);
  const flowInstruction = useAppStore((state) => state.flowInstruction);
  const flowInstructionHistory = useAppStore((state) => state.flowInstructionHistory);
  const submitFlowInstruction = useAppStore((state) => state.submitFlowInstruction);
  const [value, setValue] = useState(flowInstruction);
  const [inputInstanceKey, setInputInstanceKey] = useState(0);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [historyDraftValue, setHistoryDraftValue] = useState(flowInstruction);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateValue = (nextValue: string) => {
    setValue(nextValue);
    setInputInstanceKey((previous) => previous + 1);
    if (errorMessage) setErrorMessage(null);
  };

  const recallPreviousInstruction = () => {
    if (flowInstructionHistory.length === 0) return;

    if (historyIndex === null) {
      setHistoryDraftValue(value);
      setHistoryIndex(0);
      updateValue(flowInstructionHistory[0] ?? "");
      return;
    }

    const nextIndex = Math.min(flowInstructionHistory.length - 1, historyIndex + 1);
    if (nextIndex === historyIndex) return;

    setHistoryIndex(nextIndex);
    updateValue(flowInstructionHistory[nextIndex] ?? "");
  };

  const recallNextInstruction = () => {
    if (historyIndex === null) return;

    if (historyIndex === 0) {
      setHistoryIndex(null);
      updateValue(historyDraftValue);
      return;
    }

    const nextIndex = historyIndex - 1;
    setHistoryIndex(nextIndex);
    updateValue(flowInstructionHistory[nextIndex] ?? historyDraftValue);
  };

  const submitValue = (nextValue: string) => {
    const trimmedValue = nextValue.trim();

    if (!trimmedValue) {
      setErrorMessage("Describe the user flow you want the browser agent to test.");
      return;
    }

    submitFlowInstruction(trimmedValue);
  };

  if (!testAction) return null;

  return (
    <Box flexDirection="column" width="100%" paddingX={1} paddingY={1}>
      <ScreenHeading title={ACTION_LABELS[testAction]} />

      {selectedCommit ? (
        <Box marginTop={1}>
          <Text color={COLORS.DIM}>{"commit "}</Text>
          <Text color={COLORS.PURPLE}>{selectedCommit.shortHash}</Text>
          <Text color={COLORS.DIM}>{" · "}</Text>
          <Text color={COLORS.TEXT}>{selectedCommit.subject}</Text>
        </Box>
      ) : null}

      <Box marginTop={1} borderStyle="round" borderColor={COLORS.BORDER} paddingX={2}>
        <Text color={COLORS.PRIMARY}>{"❯ "}</Text>
        <Input
          key={`flow-input-${inputInstanceKey}`}
          focus
          multiline
          placeholder="Go through onboarding at /onboarding, click Import Projects, and verify the imported project list appears."
          value={value}
          onSubmit={submitValue}
          onUpArrowAtTop={recallPreviousInstruction}
          onDownArrowAtBottom={recallNextInstruction}
          onChange={(nextValue) => {
            const sanitizedValue = stripMouseSequences(nextValue);
            setHistoryIndex(null);
            setHistoryDraftValue(sanitizedValue);
            setValue(sanitizedValue);
            if (errorMessage) setErrorMessage(null);
          }}
        />
      </Box>

      <Box marginTop={1}>
        <Text color={COLORS.DIM}>
          {historyIndex === null
            ? "Use ↑/↓ on the first or last line to recall previous inputs."
            : `Browsing previous inputs ${historyIndex + 1}/${flowInstructionHistory.length}.`}{" "}
          Press <Text color={COLORS.PRIMARY}>Shift+Enter</Text> for a new line.
        </Text>
      </Box>

      <ErrorMessage message={errorMessage} />
    </Box>
  );
};
