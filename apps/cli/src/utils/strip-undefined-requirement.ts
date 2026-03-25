import { Effect } from "effect";

// HACK: Effect v4 beta ServiceMap inference can leave `undefined` in R even
// after layers have fully satisfied the environment.
export const stripUndefinedRequirement = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect as Effect.Effect<A, E, Exclude<R, undefined>>;
