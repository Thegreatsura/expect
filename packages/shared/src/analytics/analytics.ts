import { Effect, Layer, ServiceMap } from "effect";
import { machineId } from "node-machine-id";
import { hash } from "ohash";
import { PostHog } from "posthog-node";

import type { EventMap } from "./analytics-events";

const POSTHOG_API_KEY = "phc_t5FKk9mlc4pKbbBimiIlrM5Acq9meRp1FSuNjmwxjAX";
const POSTHOG_DEFAULT_HOST = "https://us.i.posthog.com";

const posthogClient = new PostHog(POSTHOG_API_KEY, { host: POSTHOG_DEFAULT_HOST });

// ---------------------------------------------------------------------------
// AnalyticsProvider — abstract provider that Analytics delegates to
// ---------------------------------------------------------------------------

export interface AnalyticsProviderShape {
  readonly capture: (event: {
    readonly eventName: string;
    readonly properties: Record<string, unknown>;
    readonly distinctId: string;
  }) => Effect.Effect<void>;
  readonly flush: Effect.Effect<void>;
}

export class AnalyticsProvider extends ServiceMap.Service<
  AnalyticsProvider,
  AnalyticsProviderShape
>()("@expect/AnalyticsProvider") {
  static layerPostHog = Layer.succeed(this)({
    capture: (event) =>
      Effect.sync(() => {
        posthogClient.captureImmediate({
          event: event.eventName,
          properties: event.properties,
          distinctId: event.distinctId,
        });
      }),
    flush: Effect.tryPromise({
      try: () => posthogClient.flush(),
      catch: (cause) => cause,
    }).pipe(Effect.ignore),
  });

  static layerDev = Layer.succeed(this)({
    capture: (event) =>
      Effect.logInfo("Tracked event", {
        eventName: event.eventName,
        distinctId: event.distinctId,
        ...event.properties,
      }).pipe(Effect.annotateLogs({ module: "Analytics" })),
    flush: Effect.void,
  });
}

// ---------------------------------------------------------------------------
// Analytics — public service
// ---------------------------------------------------------------------------

export class Analytics extends ServiceMap.Service<Analytics>()("@expect/Analytics", {
  make: Effect.gen(function* () {
    const provider = yield* AnalyticsProvider;

    const distinctId = yield* Effect.tryPromise({
      try: () => machineId(),
      catch: () => "unknown",
    });
    const projectId = hash(process.cwd());

    const capture = <K extends keyof EventMap>(
      eventName: K,
      ...[properties]: EventMap[K] extends undefined ? [] : [EventMap[K]]
    ) =>
      Effect.gen(function* () {
        const commonProperties = {
          timestamp: new Date().toISOString(),
          projectId,
        };

        yield* provider.capture({
          eventName: eventName as string,
          properties: { ...commonProperties, ...(properties ?? {}) },
          distinctId,
        });
      }).pipe(
        Effect.catchCause((cause) =>
          Effect.logWarning("Analytics capture failed", {
            eventName,
            cause,
          }).pipe(Effect.annotateLogs({ module: "Analytics" })),
        ),
      );

    const track: {
      <K extends keyof EventMap>(
        eventName: K & (EventMap[K] extends undefined ? K : never),
      ): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;

      <K extends keyof EventMap, A>(
        eventName: K & (EventMap[K] extends undefined ? never : K),
        deriveProperties: (result: A) => EventMap[K],
      ): <E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
    } = (<K extends keyof EventMap, A>(
      eventName: K,
      deriveProperties?: (result: A) => EventMap[K],
    ) =>
      <E, R>(self: Effect.Effect<A, E, R>) =>
        Effect.tap(self, (result) => {
          const props = deriveProperties ? deriveProperties(result) : undefined;
          return (capture as Function).call(
            undefined,
            eventName,
            ...(props !== undefined ? [props] : []),
          );
        })) as never;

    return { capture, track, flush: provider.flush } as const;
  }),
}) {
  static layerPostHog = Layer.effect(this)(this.make).pipe(
    Layer.provide(AnalyticsProvider.layerPostHog),
  );
  static layerDev = Layer.effect(this)(this.make).pipe(
    Layer.provide(AnalyticsProvider.layerDev),
  );
}
