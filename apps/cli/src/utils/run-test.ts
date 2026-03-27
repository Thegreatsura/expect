import { Config, Effect, Option, Stream, Schema } from "effect";
import { changesForDisplayName, type ChangesFor } from "@expect/shared/models";
import { Executor, ExecutedTestPlan, Reporter } from "@expect/supervisor";
import { Analytics } from "@expect/shared/observability";
import type { AgentBackend } from "@expect/agent";
import figures from "figures";
import { appendFileSync } from "node:fs";
import { VERSION, CI_HEARTBEAT_INTERVAL_MS } from "../constants";
import { layerCli } from "../layers";
import { playSound } from "./play-sound";
import { stripUndefinedRequirement } from "./strip-undefined-requirement";

class ExecutionTimeoutError extends Schema.ErrorClass<ExecutionTimeoutError>(
  "ExecutionTimeoutError",
)({
  _tag: Schema.tag("ExecutionTimeoutError"),
  timeoutMs: Schema.Number,
}) {
  message = `expect execution timed out after ${this.timeoutMs}ms`;
}

const formatElapsed = (startMs: number) => {
  const elapsed = (Date.now() - startMs) / 1000;
  return `[${elapsed.toFixed(1)}s]`;
};

const ghaEscape = (text: string) => text.replace(/\r?\n/g, " ").replace(/::/g, ": :");

interface HeadlessRunOptions {
  changesFor: ChangesFor;
  instruction: string;
  agent: AgentBackend;
  verbose: boolean;
  headed: boolean;
  ci: boolean;
  timeoutMs: Option.Option<number>;
}

export const runHeadless = (options: HeadlessRunOptions) =>
  Effect.runPromise(
    stripUndefinedRequirement(
      Effect.gen(function* () {
        const executor = yield* Executor;
        const reporter = yield* Reporter;
        const analytics = yield* Analytics;

        const sessionStartedAt = Date.now();
        yield* analytics.capture("session:started", {
          mode: "headless",
          skip_planning: false,
          browser_headed: options.headed,
        });

        const isGitHubActions =
          (yield* Config.string("GITHUB_ACTIONS").pipe(Config.withDefault(""))) !== "";

        const modeLabel = options.ci ? " [CI mode]" : "";
        console.log(`expect v${VERSION}${modeLabel}`);
        if (Option.isSome(options.timeoutMs)) {
          console.log(`Timeout: ${options.timeoutMs.value}ms`);
        }
        console.log(`Agent: ${options.agent}`);
        console.log(`Target: ${changesForDisplayName(options.changesFor)}`);
        console.log("Starting browser test...");

        if (isGitHubActions) {
          console.log("::group::expect test execution");
        }

        const runStartedAt = Date.now();
        let lastOutputAt = Date.now();

        const heartbeatInterval = options.ci
          ? setInterval(() => {
              const now = Date.now();
              if (now - lastOutputAt >= CI_HEARTBEAT_INTERVAL_MS) {
                const elapsedMinutes = Math.floor((now - runStartedAt) / 60_000);
                console.log(
                  `${formatElapsed(runStartedAt)} Still running... (${elapsedMinutes} minute${elapsedMinutes === 1 ? "" : "s"} elapsed)`,
                );
                lastOutputAt = now;
              }
            }, CI_HEARTBEAT_INTERVAL_MS)
          : undefined;

        yield* analytics.capture("run:started", { plan_id: "direct" });
        const seenEvents = new Set<string>();
        const printNewEvents = (executed: ExecutedTestPlan) => {
          for (const event of executed.events) {
            if (seenEvents.has(event.id)) continue;
            seenEvents.add(event.id);
            lastOutputAt = Date.now();
            const elapsed = formatElapsed(runStartedAt);
            switch (event._tag) {
              case "RunStarted":
                console.log(`${elapsed} Starting ${event.plan.title}`);
                break;
              case "StepStarted":
                console.log(`${elapsed} ${figures.arrowRight} ${event.stepId} ${event.title}`);
                break;
              case "StepCompleted":
                console.log(`${elapsed}   ${figures.tick} ${event.stepId} ${event.summary}`);
                break;
              case "StepFailed": {
                console.log(`${elapsed}   ${figures.cross} ${event.stepId} ${event.message}`);
                if (isGitHubActions) {
                  console.log(
                    `::error title=${ghaEscape(event.stepId)} failed::${ghaEscape(event.message)}`,
                  );
                }
                break;
              }
              case "StepSkipped":
                console.log(
                  `${elapsed}   ${figures.arrowRight} ${event.stepId} [skipped] ${event.reason}`,
                );
                break;
            }
          }
        };

        const executeStream = executor
          .execute({
            changesFor: options.changesFor,
            instruction: options.instruction,
            isHeadless: !options.headed,
            requiresCookies: false,
          })
          .pipe(
            Stream.tap((executed) => Effect.sync(() => printNewEvents(executed))),
            Stream.runLast,
            Effect.map((option) =>
              (option._tag === "Some"
                ? option.value
                : new ExecutedTestPlan({
                    id: "" as never,
                    changesFor: options.changesFor,
                    currentBranch: "",
                    diffPreview: "",
                    fileStats: [],
                    instruction: options.instruction,
                    baseUrl: undefined as never,
                    isHeadless: !options.headed,
                    requiresCookies: false,
                    testCoverage: Option.none(),
                    title: options.instruction,
                    rationale: "Direct execution",
                    steps: [],
                    events: [],
                  })
              ).finalizeTextBlock(),
            ),
          );

        const timeoutMs = Option.getOrUndefined(options.timeoutMs);
        const executeWithTimeout =
          timeoutMs !== undefined
            ? executeStream.pipe(
                Effect.timeoutOrElse({
                  duration: `${timeoutMs} millis`,
                  onTimeout: () => Effect.fail(new ExecutionTimeoutError({ timeoutMs })),
                }),
              )
            : executeStream;

        const finalExecuted = yield* executeWithTimeout.pipe(
          Effect.tapError(() =>
            Effect.sync(() => {
              if (heartbeatInterval) clearInterval(heartbeatInterval);
              if (isGitHubActions) console.log("::endgroup::");
            }),
          ),
          Effect.catchTag("ExecutionTimeoutError", (error) =>
            Effect.sync(() => {
              if (isGitHubActions) {
                console.log(`::error title=Execution timed out::${ghaEscape(error.message)}`);
              }
              console.error(`\n${error.message}`);
              process.exit(1);
            }),
          ),
        );

        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
        }

        printNewEvents(finalExecuted);

        if (isGitHubActions) {
          console.log("::endgroup::");
        }

        const report = yield* reporter.report(finalExecuted);

        const passedCount = report.steps.filter(
          (step) => report.stepStatuses.get(step.id)?.status === "passed",
        ).length;
        const failedCount = report.steps.filter(
          (step) => report.stepStatuses.get(step.id)?.status === "failed",
        ).length;

        yield* analytics.capture("run:completed", {
          plan_id: finalExecuted.id ?? "direct",
          passed: passedCount,
          failed: failedCount,
          step_count: finalExecuted.steps.length,
          file_count: 0,
          duration_ms: Date.now() - runStartedAt,
        });

        yield* analytics.capture("session:ended", {
          session_ms: Date.now() - sessionStartedAt,
        });
        yield* analytics.flush;

        const reportText = report.toPlainText;
        console.error(`\n${reportText}`);

        const stepSummaryPath = yield* Config.option(Config.string("GITHUB_STEP_SUMMARY"));
        if (Option.isSome(stepSummaryPath)) {
          const badge = report.status === "passed" ? "**Result: PASSED**" : "**Result: FAILED**";
          const summary = `## expect test results\n\n${badge}\n\n\`\`\`\n${reportText}\n\`\`\`\n`;
          yield* Effect.sync(() => appendFileSync(stepSummaryPath.value, summary));
        }

        yield* Effect.promise(() => playSound());
        process.exit(report.status === "passed" ? 0 : 1);
      }).pipe(Effect.provide(layerCli({ verbose: options.verbose, agent: options.agent }))),
    ),
  );
