import { Effect, FileSystem } from "effect";
import * as path from "node:path";
import { EXPECT_STATE_DIR } from "../constants";

export const ensureStateDir = Effect.fn("ensureStateDir")(function* (baseDir: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const stateDir = path.join(baseDir, EXPECT_STATE_DIR);

  yield* fileSystem
    .makeDirectory(stateDir, { recursive: true })
    .pipe(Effect.catchTag("PlatformError", () => Effect.void));

  const gitignorePath = path.join(stateDir, ".gitignore");
  const gitignoreExists = yield* fileSystem
    .exists(gitignorePath)
    .pipe(Effect.catchTag("PlatformError", () => Effect.succeed(false)));

  if (!gitignoreExists) {
    yield* fileSystem
      .writeFileString(gitignorePath, "*\n")
      .pipe(Effect.catchTag("PlatformError", () => Effect.void));
  }

  return stateDir;
});
