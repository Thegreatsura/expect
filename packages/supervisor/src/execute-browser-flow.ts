import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { LanguageModelV3 } from "@ai-sdk/provider";
import type { AgentProviderSettings } from "@browser-tester/agent";
import {
  BROWSER_TEST_MODEL,
  DEFAULT_AGENT_PROVIDER,
  DEFAULT_BROWSER_MCP_SERVER_NAME,
  EXECUTION_MODEL_EFFORT,
  VIDEO_DIRECTORY_PREFIX,
  VIDEO_FILE_NAME,
} from "./constants.js";
import { buildBrowserMcpSettings } from "./browser-mcp-config.js";
import { createBrowserRunReport } from "./create-browser-run-report.js";
import { createAgentModel } from "./create-agent-model.js";
import type { BrowserRunEvent } from "./events.js";
import {
  buildStepMap,
  extractStreamSessionId,
  parseBrowserToolName,
  parseMarkerLine,
  parseTextDelta,
} from "./parse-execution-stream.js";
import type { ExecutionStreamContext, ExecutionStreamState } from "./parse-execution-stream.js";
import { retrieveExecutorMemory } from "./memory/retrieve-executor-memory.js";
import type { ExecuteBrowserFlowOptions, PlanStep } from "./types.js";
import { saveBrowserImageResult } from "./utils/save-browser-image-result.js";
import { serializeToolResult } from "./utils/serialize-tool-result.js";
import { resolveLiveViewUrl } from "./utils/resolve-live-view-url.js";

const BROWSER_EXECUTION_TOOL_NAMES = ["open", "playwright", "screenshot", "close"];

const buildExecutionToolAllowlist = (browserMcpServerName: string): string[] =>
  BROWSER_EXECUTION_TOOL_NAMES.map((toolName) => `mcp__${browserMcpServerName}__${toolName}`);

export const buildExecutionModelSettings = (
  options: Pick<
    ExecuteBrowserFlowOptions,
    | "provider"
    | "providerSettings"
    | "target"
    | "browserMcpServerName"
    | "videoOutputPath"
    | "liveViewUrl"
  >,
): AgentProviderSettings => {
  const provider = options.provider ?? DEFAULT_AGENT_PROVIDER;
  const browserMcpServerName = options.browserMcpServerName ?? DEFAULT_BROWSER_MCP_SERVER_NAME;

  return buildBrowserMcpSettings({
    providerSettings: {
      cwd: options.target.cwd,
      ...(provider === "claude" ? { model: BROWSER_TEST_MODEL } : {}),
      ...(options.providerSettings ?? {}),
      effort: EXECUTION_MODEL_EFFORT,
      tools: buildExecutionToolAllowlist(browserMcpServerName),
    },
    browserMcpServerName,
    videoOutputPath: options.videoOutputPath,
    liveViewUrl: options.liveViewUrl,
  });
};

const createExecutionModel = (
  options: Pick<
    ExecuteBrowserFlowOptions,
    | "model"
    | "provider"
    | "providerSettings"
    | "target"
    | "browserMcpServerName"
    | "videoOutputPath"
    | "liveViewUrl"
  >,
): LanguageModelV3 => {
  if (options.model) return options.model;

  const provider = options.provider ?? DEFAULT_AGENT_PROVIDER;
  const settings = buildExecutionModelSettings(options);

  return createAgentModel(provider, settings);
};

const formatPlanSteps = (steps: PlanStep[]): string =>
  steps
    .map((step) =>
      [
        `- ${step.id}: ${step.title}`,
        `  instruction: ${step.instruction}`,
        `  expected outcome: ${step.expectedOutcome}`,
        `  route hint: ${step.routeHint ?? "none"}`,
        `  changed file evidence: ${
          step.changedFileEvidence && step.changedFileEvidence.length > 0
            ? step.changedFileEvidence.join(", ")
            : "none"
        }`,
      ].join("\n"),
    )
    .join("\n");

const buildExecutionPrompt = (
  options: ExecuteBrowserFlowOptions,
  memoryContext?: string,
): string => {
  const { plan, target, environment, browserMcpServerName, videoOutputPath } = options;
  const mcpName = browserMcpServerName ?? DEFAULT_BROWSER_MCP_SERVER_NAME;

  return [
    "You are executing an approved browser test plan.",
    `You have 4 browser tools via the MCP server named "${mcpName}":`,
    "",
    "1. open — Launch a browser and navigate to a URL.",
    "2. playwright — Execute Playwright code in Node.js. Globals: page (Page), context (BrowserContext), browser (Browser), ref(id) (resolves a snapshot ref like 'e4' to a Playwright Locator). Supports await. Return a value to get it back as JSON.",
    "3. screenshot — Capture page state. Set mode: 'snapshot' (ARIA accessibility tree, default and preferred), 'screenshot' (PNG image), or 'annotated' (PNG with numbered labels on interactive elements).",
    "4. close — Close the browser and flush the video recording.",
    "",
    "Strongly prefer screenshot with mode 'snapshot' for observing page state — the ARIA tree is fast, cheap, and sufficient for almost all assertions.",
    "Only use mode 'screenshot' or 'annotated' when you need to verify something purely visual (layout, colors, images) that the accessibility tree cannot capture.",
    "",
    "Snapshot-driven workflow:",
    "1. Call screenshot with mode 'snapshot' to get the ARIA tree with refs.",
    "2. Read the tree to find your target elements. Every interactive element has a ref like [ref=e4].",
    "3. Use ref() in one playwright call to perform multiple actions using the refs from the snapshot — fill forms, click buttons, wait, and return results all in one block.",
    "4. Only take a new snapshot when the page structure has changed significantly (navigation, modal open, new content loaded) and you need fresh refs.",
    "",
    "Example snapshot tree:",
    "  - navigation",
    '    - link "Home" [ref=e1]',
    '    - link "About" [ref=e2]',
    "  - main",
    '    - heading "Welcome"',
    '    - textbox "Email" [ref=e3]',
    '    - button "Submit" [ref=e4]',
    "",
    "Acting on refs — use ref() to get a Locator directly from the snapshot ref ID:",
    "  await ref('e3').fill('test@example.com');",
    "  await ref('e4').click();",
    "  await ref('e1').click();",
    "",
    "Always snapshot first, then use ref() to act. Never guess CSS selectors.",
    "",
    "Batch as many actions as possible into a single playwright call to minimize round trips:",
    "  playwright: await ref('e3').fill('test@example.com'); await ref('e5').fill('secret'); await ref('e6').click(); await page.waitForLoadState('networkidle'); return await page.innerText('.result');",
    "  playwright: await ref('e1').click(); await page.waitForURL('**/about');",
    "  playwright: return { url: page.url(), title: await page.title() };",
    "",
    "Follow the approved steps in order. You may adapt to UI details, but do not invent a different goal.",
    "Execution style: assertion-first. For each step, think in loops: navigate, act, validate, recover, then fail if still blocked.",
    "A browser video recording is enabled for this run.",
    "",
    "Before and after each step, emit these exact status lines on their own lines:",
    "STEP_START|<step-id>|<step-title>",
    "STEP_DONE|<step-id>|<short-summary>",
    "ASSERTION_FAILED|<step-id>|<why-it-failed>",
    "RUN_COMPLETED|passed|<final-summary>",
    "RUN_COMPLETED|failed|<final-summary>",
    "",
    "Allowed failure categories: app-bug, env-issue, auth-blocked, missing-test-data, selector-drift, agent-misread.",
    "When a step fails, gather structured evidence before emitting ASSERTION_FAILED:",
    "- Call screenshot with mode 'snapshot' to capture the ARIA tree.",
    "- Use playwright to gather diagnostics: return { url: page.url(), title: await page.title(), text: await page.innerText('body').then(t => t.slice(0, 500)) };",
    "- Only take a visual screenshot if the failure might be layout/rendering related.",
    "- Summarize the failure category and the most important evidence inside <why-it-failed>.",
    "",
    "Stability heuristics:",
    "- After navigation or major UI changes, use playwright to wait for the page to settle (e.g. await page.waitForLoadState('networkidle')).",
    "- Use screenshot with mode 'snapshot' to inspect the accessibility tree before interactions that depend on current UI state.",
    "- Avoid interacting while the UI is visibly loading or transitioning.",
    "- Confirm you reached the expected page or route before continuing.",
    "",
    "Recovery policy for each blocked step:",
    "- Take a new snapshot to re-inspect the page and get fresh refs.",
    "- Use playwright with ref() to scroll the target into view or retry the interaction once.",
    "- If still blocked, classify the blocker with one allowed failure category and include that classification in ASSERTION_FAILED.",
    "",
    "Before emitting RUN_COMPLETED, call the close tool exactly once so the browser session flushes the video to disk.",
    "",
    "Environment:",
    `- Base URL: ${environment?.baseUrl ?? "not provided"}`,
    `- Headed mode preference: ${environment?.headed === true ? "headed" : "headless or not specified"}`,
    `- Reuse browser cookies: ${environment?.cookies === true ? "yes" : "no or not specified"}`,
    `- Video output path: ${videoOutputPath ?? "not configured"}`,
    "",
    "Testing target context:",
    `- Scope: ${target.scope}`,
    `- Display name: ${target.displayName}`,
    `- Current branch: ${target.branch.current}`,
    `- Main branch: ${target.branch.main ?? "unknown"}`,
    "",
    ...(memoryContext
      ? [
          "Past experience with similar routes (use to anticipate issues and improve execution):",
          memoryContext,
          "",
        ]
      : []),
    "Approved plan:",
    `Title: ${plan.title}`,
    `Rationale: ${plan.rationale}`,
    `Target summary: ${plan.targetSummary}`,
    `User instruction: ${plan.userInstruction}`,
    `Assumptions: ${plan.assumptions.length > 0 ? plan.assumptions.join("; ") : "none"}`,
    `Risk areas: ${plan.riskAreas.length > 0 ? plan.riskAreas.join("; ") : "none"}`,
    `Target URLs: ${plan.targetUrls.length > 0 ? plan.targetUrls.join(", ") : "none"}`,
    "",
    formatPlanSteps(plan.steps),
  ].join("\n");
};

const createVideoOutputPath = (): string => {
  const videoDirectory = mkdtempSync(join(tmpdir(), VIDEO_DIRECTORY_PREFIX));
  return join(videoDirectory, VIDEO_FILE_NAME);
};

export const executeBrowserFlow = async function* (
  options: ExecuteBrowserFlowOptions,
): AsyncGenerator<BrowserRunEvent> {
  const browserMcpServerName = options.browserMcpServerName ?? DEFAULT_BROWSER_MCP_SERVER_NAME;
  const videoOutputPath = options.videoOutputPath ?? createVideoOutputPath();
  const liveViewUrl = options.liveViewUrl ?? (await resolveLiveViewUrl().catch(() => undefined));
  const model = createExecutionModel({
    model: options.model,
    provider: options.provider,
    providerSettings: options.providerSettings,
    target: options.target,
    browserMcpServerName,
    videoOutputPath,
    liveViewUrl,
  });
  let memoryContext: string | undefined;
  try {
    memoryContext = retrieveExecutorMemory(options.target.cwd, {
      targetUrls: options.plan.targetUrls,
      steps: options.plan.steps,
    });
  } catch {}

  const prompt = buildExecutionPrompt(
    { ...options, browserMcpServerName, videoOutputPath },
    memoryContext,
  );

  const emittedEvents: BrowserRunEvent[] = [];
  const runStartedEvent: BrowserRunEvent = {
    type: "run-started",
    timestamp: Date.now(),
    planTitle: options.plan.title,
    liveViewUrl,
  };
  emittedEvents.push(runStartedEvent);
  yield runStartedEvent;

  const streamResult = await model.doStream({
    abortSignal: options.signal,
    prompt: [{ role: "user", content: [{ type: "text", text: prompt }] }],
  });

  const reader = streamResult.stream.getReader();
  let streamState: ExecutionStreamState = { bufferedText: "" };
  let completionEvent: Extract<BrowserRunEvent, { type: "run-completed" }> | null = null;
  let screenshotOutputDirectoryPath: string | undefined;
  const screenshotPaths: string[] = [];
  const streamContext: ExecutionStreamContext = {
    browserMcpServerName,
    stepsById: buildStepMap(options.plan.steps),
  };

  for (;;) {
    const nextChunk = await reader.read();
    if (nextChunk.done) break;

    const part = nextChunk.value;

    if (part.type === "text-delta") {
      const parsedText = parseTextDelta(part.delta, streamState, streamContext);
      streamState = parsedText.nextState;
      for (const event of parsedText.events) {
        if (event.type === "run-completed") {
          completionEvent = {
            ...event,
            sessionId: streamState.sessionId,
            videoPath: videoOutputPath,
          };
        } else {
          emittedEvents.push(event);
          yield event;
        }
      }
      continue;
    }

    if (part.type === "reasoning-delta") {
      const event: BrowserRunEvent = {
        type: "thinking",
        timestamp: Date.now(),
        text: part.delta,
      };
      emittedEvents.push(event);
      yield event;
      continue;
    }

    if (part.type === "tool-call") {
      const toolCallEvent: BrowserRunEvent = {
        type: "tool-call",
        timestamp: Date.now(),
        toolName: part.toolName,
        input: part.input,
      };
      emittedEvents.push(toolCallEvent);
      yield toolCallEvent;

      const browserAction = parseBrowserToolName(part.toolName, browserMcpServerName);
      if (browserAction) {
        const browserLogEvent: BrowserRunEvent = {
          type: "browser-log",
          timestamp: Date.now(),
          action: browserAction,
          message: `Called ${browserAction}`,
        };
        emittedEvents.push(browserLogEvent);
        yield browserLogEvent;
      }
      continue;
    }

    if (part.type === "tool-result") {
      const browserAction = parseBrowserToolName(part.toolName, browserMcpServerName);
      let result = serializeToolResult(part.result);
      if (browserAction === "screenshot") {
        const savedBrowserImageResult = saveBrowserImageResult({
          browserAction,
          outputDirectoryPath: screenshotOutputDirectoryPath,
          result,
        });

        if (savedBrowserImageResult) {
          screenshotOutputDirectoryPath = savedBrowserImageResult.outputDirectoryPath;
          screenshotPaths.push(savedBrowserImageResult.outputPath);
          result = savedBrowserImageResult.resultText;
        }
      }

      const toolResultEvent: BrowserRunEvent = {
        type: "tool-result",
        timestamp: Date.now(),
        toolName: part.toolName,
        result,
        isError: Boolean(part.isError),
      };
      emittedEvents.push(toolResultEvent);
      yield toolResultEvent;

      if (browserAction) {
        const browserLogEvent: BrowserRunEvent = {
          type: "browser-log",
          timestamp: Date.now(),
          action: browserAction,
          message: result,
        };
        emittedEvents.push(browserLogEvent);
        yield browserLogEvent;
      }
      continue;
    }

    const sessionId = extractStreamSessionId(part);
    if (sessionId) {
      streamState = {
        ...streamState,
        sessionId,
      };
    }
  }

  if (streamState.bufferedText.trim()) {
    const trailingEvent = parseMarkerLine(streamState.bufferedText.trim(), streamContext);
    if (trailingEvent) {
      if (Array.isArray(trailingEvent)) {
        for (const event of trailingEvent) {
          if (event.type === "run-completed") {
            completionEvent = {
              ...event,
              sessionId: streamState.sessionId,
              videoPath: videoOutputPath,
            };
          } else {
            emittedEvents.push(event);
            yield event;
          }
        }
      } else {
        if (trailingEvent.type === "run-completed") {
          completionEvent = {
            ...trailingEvent,
            sessionId: streamState.sessionId,
            videoPath: videoOutputPath,
          };
        } else {
          emittedEvents.push(trailingEvent);
          yield trailingEvent;
        }
      }
    }
  }

  const resolvedCompletionEvent =
    completionEvent ??
    ({
      type: "run-completed",
      timestamp: Date.now(),
      status: "passed",
      summary: "Run completed.",
      sessionId: streamState.sessionId,
      videoPath: videoOutputPath,
    } satisfies Extract<BrowserRunEvent, { type: "run-completed" }>);

  const preparingResultsEvent: BrowserRunEvent = {
    type: "text",
    timestamp: Date.now(),
    text: "Preparing results report...",
  };
  yield preparingResultsEvent;

  yield {
    ...resolvedCompletionEvent,
    report: createBrowserRunReport({
      target: options.target,
      plan: options.plan,
      events: emittedEvents,
      completionEvent: resolvedCompletionEvent,
      rawVideoPath: videoOutputPath,
      screenshotPaths,
    }),
  };
};
