import { useEffect, useState } from "react";
import { Box, Static, Text, useInput } from "ink";
import figures from "figures";
import { DateTime, Option } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as Atom from "effect/unstable/reactivity/Atom";
import { useAtom, useAtomValue } from "@effect/atom-react";

import {
  type ChangesFor,
  type SavedFlow,
  TestPlanStep,
  type ExecutedTestPlan,
  type ExecutionEvent,
} from "@expect/shared/models";
import { TESTING_TIMER_UPDATE_INTERVAL_MS, TESTING_TOOL_TEXT_CHAR_LIMIT } from "../../constants";
import { useColors, theme } from "../theme-context";
import InkSpinner from "ink-spinner";
import { Spinner } from "../ui/spinner";
import { TextShimmer } from "../ui/text-shimmer";
import { Logo } from "../ui/logo";
import { usePlanExecutionStore } from "../../stores/use-plan-execution-store";
import { usePreferencesStore } from "../../stores/use-preferences";
import { useNavigationStore, Screen } from "../../stores/use-navigation";
import cliTruncate from "cli-truncate";
import { formatElapsedTime } from "../../utils/format-elapsed-time";
import { Image } from "../ui/image";
import { ErrorMessage } from "../ui/error-message";
import { executeFn, screenshotPathsAtom } from "../../data/execution-atom";
import { formatToolCall, type FormattedToolCall } from "../../utils/format-tool-call";

interface TestingScreenProps {
  changesFor: ChangesFor;
  instruction: string;
  savedFlow?: SavedFlow;
  requiresCookies?: boolean;
}

interface ToolCallDisplay {
  tool: FormattedToolCall;
  isRunning: boolean;
  resultTokens: number | undefined;
}

const MAX_VISIBLE_TOOL_CALLS = 5;
const APPROX_CHARS_PER_TOKEN = 4;

const formatTokenCount = (tokens: number): string => {
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
  return `${tokens}`;
};

const getRecentToolCalls = (
  events: readonly ExecutionEvent[],
  fromIndex: number,
): ToolCallDisplay[] => {
  const calls: ToolCallDisplay[] = [];

  for (let index = fromIndex; index < events.length; index++) {
    const event = events[index];
    if (event._tag === "ToolCall") {
      calls.push({
        tool: formatToolCall(event.toolName, event.input),
        isRunning: false,
        resultTokens: undefined,
      });
    }
    if (event._tag === "ToolProgress" && calls.length > 0) {
      const lastCall = calls[calls.length - 1];
      calls[calls.length - 1] = {
        ...lastCall,
        resultTokens: Math.round(event.outputSize / APPROX_CHARS_PER_TOKEN),
      };
    }
    if (event._tag === "ToolResult" && calls.length > 0) {
      const lastCall = calls[calls.length - 1];
      calls[calls.length - 1] = {
        ...lastCall,
        resultTokens: Math.round(event.result.length / APPROX_CHARS_PER_TOKEN),
      };
    }
  }

  if (calls.length > 0) {
    const lastEvent = events.at(-1);
    const isLastDone = lastEvent?._tag === "ToolResult";
    calls[calls.length - 1] = { ...calls[calls.length - 1], isRunning: !isLastDone };
  }

  return calls.slice(-MAX_VISIBLE_TOOL_CALLS);
};

const getActiveStepToolCalls = (events: readonly ExecutionEvent[]): ToolCallDisplay[] => {
  let lastStepStartIndex = -1;
  for (let index = events.length - 1; index >= 0; index--) {
    if (events[index]._tag === "StepStarted") {
      lastStepStartIndex = index;
      break;
    }
  }
  if (lastStepStartIndex === -1) return [];
  return getRecentToolCalls(events, lastStepStartIndex + 1);
};

const getPlanningToolCalls = (events: readonly ExecutionEvent[]): ToolCallDisplay[] =>
  getRecentToolCalls(events, 0);

const ToolCallBlock = ({
  display,
  indent,
}: {
  readonly display: ToolCallDisplay;
  readonly indent: string;
}) => {
  const COLORS = useColors();
  return (
    <Text color={COLORS.DIM} wrap="truncate">
      {indent}
      {figures.lineVertical} <Text color={COLORS.TEXT}>{display.tool.name}</Text>(
      {display.tool.args})
      {display.isRunning && (
        <Text>
          {" "}
          <InkSpinner type="line" />
        </Text>
      )}
      {display.resultTokens !== undefined &&
        ` ${figures.arrowDown} ${formatTokenCount(display.resultTokens)} tokens`}
    </Text>
  );
};

const getStepElapsedMs = (step: TestPlanStep): number | undefined => {
  if (Option.isNone(step.startedAt)) return undefined;
  const endMs = Option.isSome(step.endedAt)
    ? DateTime.toEpochMillis(step.endedAt.value)
    : Date.now();
  return endMs - DateTime.toEpochMillis(step.startedAt.value);
};

export const TestingScreen = ({
  changesFor,
  instruction,
  savedFlow,
  requiresCookies = false,
}: TestingScreenProps) => {
  const setScreen = useNavigationStore((state) => state.setScreen);
  const COLORS = useColors();

  const agentBackend = usePreferencesStore((state) => state.agentBackend);
  const browserHeaded = usePreferencesStore((state) => state.browserHeaded);
  const replayHost = usePreferencesStore((state) => state.replayHost);
  const [executionResult, triggerExecute] = useAtom(executeFn, {
    mode: "promiseExit",
  });
  const screenshotPaths = useAtomValue(screenshotPathsAtom);

  const isExecuting = AsyncResult.isWaiting(executionResult);
  const isExecutionComplete = AsyncResult.isSuccess(executionResult);
  const report = isExecutionComplete ? executionResult.value.report : undefined;

  const [executedPlan, setExecutedPlan] = useState<ExecutedTestPlan | undefined>(undefined);
  const [runStartedAt, setRunStartedAt] = useState<number | undefined>(undefined);
  const [elapsedTimeMs, setElapsedTimeMs] = useState(0);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);

  useEffect(() => {
    setRunStartedAt(Date.now());

    triggerExecute({
      options: {
        changesFor,
        instruction,
        isHeadless: !browserHeaded,
        requiresCookies,
        savedFlow,
      },
      agentBackend,
      replayHost,
      onUpdate: setExecutedPlan,
    });

    return () => {
      triggerExecute(Atom.Interrupt);
    };
  }, [
    triggerExecute,
    agentBackend,
    browserHeaded,
    changesFor,
    instruction,
    savedFlow,
    requiresCookies,
  ]);

  const replayUrl = isExecutionComplete ? executionResult.value.replayUrl : undefined;

  useEffect(() => {
    if (isExecutionComplete && executedPlan && report) {
      usePlanExecutionStore.getState().setExecutedPlan(executedPlan);
      setScreen(Screen.Results({ report, replayUrl }));
    }
  }, [isExecutionComplete, executedPlan, report, replayUrl, setScreen]);

  const goToMain = () => {
    usePlanExecutionStore.getState().setExecutedPlan(undefined);
    setScreen(Screen.Main());
  };

  useEffect(() => {
    if (runStartedAt === undefined) return;
    if (!isExecuting) return;
    const interval = setInterval(() => {
      setElapsedTimeMs(Date.now() - runStartedAt);
    }, TESTING_TIMER_UPDATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [runStartedAt, isExecuting]);

  useInput((input, key) => {
    const normalizedInput = input.toLowerCase();

    if (showCancelConfirmation) {
      if (key.return || normalizedInput === "y") {
        setShowCancelConfirmation(false);
        goToMain();
        return;
      }
      if (key.escape || normalizedInput === "n") {
        setShowCancelConfirmation(false);
      }
      return;
    }

    if (key.escape) {
      if (AsyncResult.isFailure(executionResult)) {
        goToMain();
        return;
      }
      if (isExecuting) {
        setShowCancelConfirmation(true);
        return;
      }
      if (executedPlan && report) {
        usePlanExecutionStore.getState().setExecutedPlan(executedPlan);
        setScreen(Screen.Results({ report, replayUrl }));
        return;
      }
      goToMain();
    }
  });

  const completedCount = executedPlan?.steps
    ? executedPlan.steps.filter(
        (step: TestPlanStep) => step.status === "passed" || step.status === "failed",
      ).length
    : 0;
  const totalCount = executedPlan?.steps ? executedPlan.steps.length : 0;

  const elapsedTimeLabel = formatElapsedTime(elapsedTimeMs);

  return (
    <>
      <Static items={[...screenshotPaths]}>
        {(screenshotPath) => (
          <Box key={screenshotPath} paddingX={1}>
            <Image src={screenshotPath} alt={screenshotPath} />
          </Box>
        )}
      </Static>
      <Box flexDirection="column" width="100%" paddingY={1} paddingX={1}>
        <Box>
          <Logo />
          <Text wrap="truncate">
            {" "}
            <Text color={COLORS.DIM}>{figures.pointerSmall}</Text>{" "}
            <Text color={COLORS.TEXT}>{instruction}</Text>
          </Text>
        </Box>

        {totalCount === 0 &&
          isExecuting &&
          (() => {
            const toolCalls = executedPlan ? getPlanningToolCalls(executedPlan.events) : [];
            return (
              <Box marginTop={1} flexDirection="column">
                <Box>
                  <Spinner />
                  <Text> </Text>
                  <TextShimmer
                    text={`Starting${figures.ellipsis} ${elapsedTimeLabel}`}
                    baseColor={theme.shimmerBase}
                    highlightColor={theme.shimmerHighlight}
                  />
                </Box>
                {toolCalls.map((tool, toolIndex) => (
                  <ToolCallBlock key={toolIndex} display={tool} indent={"  "} />
                ))}
              </Box>
            );
          })()}

        <Box flexDirection="column" marginTop={1}>
          {(executedPlan?.steps ?? []).map((step: TestPlanStep, stepIndex: number) => {
            const label = Option.isSome(step.summary) ? step.summary.value : step.title;
            const stepElapsedMs = getStepElapsedMs(step);
            const stepElapsedLabel =
              stepElapsedMs !== undefined ? formatElapsedTime(stepElapsedMs) : undefined;
            const num = `${stepIndex + 1}.`;

            if (step.status === "active") {
              const toolCalls = executedPlan ? getActiveStepToolCalls(executedPlan.events) : [];
              return (
                <Box key={step.id} flexDirection="column">
                  <Box>
                    <Text color={COLORS.DIM}>
                      {"  "}
                      {num}{" "}
                    </Text>
                    <Spinner />
                    <Text> </Text>
                    <TextShimmer
                      text={`${step.title} ${elapsedTimeLabel}`}
                      baseColor={theme.shimmerBase}
                      highlightColor={theme.shimmerHighlight}
                    />
                  </Box>
                  {toolCalls.map((tool, toolIndex) => (
                    <ToolCallBlock key={toolIndex} display={tool} indent={"     "} />
                  ))}
                </Box>
              );
            }

            if (step.status === "passed") {
              return (
                <Text key={step.id}>
                  <Text color={COLORS.DIM}>
                    {"  "}
                    {num}
                  </Text>
                  <Text color={COLORS.GREEN}>
                    {" "}
                    {figures.tick} {cliTruncate(label, TESTING_TOOL_TEXT_CHAR_LIMIT)}
                  </Text>
                  {stepElapsedLabel && <Text color={COLORS.DIM}> {stepElapsedLabel}</Text>}
                </Text>
              );
            }

            if (step.status === "failed") {
              return (
                <Text key={step.id}>
                  <Text color={COLORS.DIM}>
                    {"  "}
                    {num}
                  </Text>
                  <Text color={COLORS.RED}>
                    {" "}
                    {figures.cross} {cliTruncate(label, TESTING_TOOL_TEXT_CHAR_LIMIT)}
                  </Text>
                  {stepElapsedLabel && <Text color={COLORS.DIM}> {stepElapsedLabel}</Text>}
                </Text>
              );
            }

            return (
              <Text key={step.id} color={COLORS.DIM}>
                {"  "}
                {num} {figures.circle} {step.title}
              </Text>
            );
          })}
        </Box>

        {showCancelConfirmation && (
          <Box marginTop={1}>
            <Text color={COLORS.YELLOW}>
              Stop run? <Text color={COLORS.PRIMARY}>y</Text>/<Text color={COLORS.PRIMARY}>n</Text>
            </Text>
          </Box>
        )}

        {AsyncResult.builder(executionResult)
          .onError((error) => (
            <ErrorMessage message={error instanceof Error ? error.message : String(error)} />
          ))
          .orNull()}
      </Box>
    </>
  );
};
