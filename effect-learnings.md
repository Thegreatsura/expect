# Effect-TS Learnings

Deep investigation of the Effect skills (`effect-best-practices`, `effect-portable-patterns`) and the `ami-next` codebase (~90+ Effect files across 5 packages). Documents patterns, architecture, code style, and conventions.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Two Modes of Effect Usage](#two-modes-of-effect-usage)
3. [Service Pattern](#service-pattern)
4. [Error Pattern](#error-pattern)
5. [Schema & Model Pattern](#schema--model-pattern)
6. [Layer Composition](#layer-composition)
7. [RPC Pattern](#rpc-pattern)
8. [Atom Pattern (Frontend State)](#atom-pattern-frontend-state)
9. [Observability](#observability)
10. [Portable Effect (No DI)](#portable-effect-no-di)
11. [SQL Repository Pattern](#sql-repository-pattern)
12. [Migration Pattern](#migration-pattern)
13. [PubSub & Real-Time Streaming](#pubsub--real-time-streaming)
14. [FiberMap for Concurrent Task Management](#fibermap-for-concurrent-task-management)
15. [Resource Management (acquireRelease, Scoped)](#resource-management-acquirerelease-scoped)
16. [Analytics Pattern](#analytics-pattern)
17. [ManagedRuntime Pattern (Next.js)](#managedruntime-pattern-nextjs)
18. [Git Service — Dynamic Context Injection](#git-service--dynamic-context-injection)
19. [Tagged Union Models (Update Content)](#tagged-union-models-update-content)
20. [Frontend Pull Atoms (Streaming)](#frontend-pull-atoms-streaming)
21. [Terminal Service Lifecycle](#terminal-service-lifecycle)
22. [Utility Patterns (Effect.option, .asEffect, Effect.flip)](#utility-patterns)
23. [Schema Type Hierarchy](#schema-type-hierarchy)
24. [Anti-Patterns](#anti-patterns)
25. [Effect Version & Imports](#effect-version--imports)

---

## Architecture Overview

`ami-next` is a **pnpm monorepo** with Effect used across every layer:

```
packages/shared/     → Schemas, Models, RPC definitions, branded IDs, errors
packages/cli/        → CLI binary (Effect CLI, HTTP server)
apps/backend/        → Services, layers, SQL repos, RPC handler layers, migrations
apps/frontend/       → Next.js app with Effect atoms, RPC client, React hooks
apps/website/        → Marketing site (light Effect for API routes)
```

**Data flow**: Shared schemas define the contract → Backend services implement logic → RPC layers expose endpoints → Frontend atoms consume via `AtomRpc.Service` over WebSocket.

Effect version: **4.0.0-beta.28** (unstable subpath imports like `effect/unstable/rpc`, `effect/unstable/reactivity`, `effect/unstable/sql`).

---

## Two Modes of Effect Usage

### 1. Full DI Mode (`effect-best-practices`)

Used in services, backend, and frontend atoms. Leverages services, layers, dependency injection, and the full Effect ecosystem.

- `ServiceMap.Service` (or `Effect.Service`) for service definitions
- `Layer.provide` / `Layer.mergeAll` for dependency composition
- `Schema.ErrorClass` / `Schema.TaggedError` for typed errors
- `Effect.fn("name")` for traced functions
- `Atom.runtime()` / `AtomRpc.Service` for frontend

### 2. Portable Mode (`effect-portable-patterns`)

Used for standalone async operations. No services, no layers, no DI. Everything is `Effect<Success, Error, never>` (no requirements).

- `Data.TaggedError` for errors (not `Schema.TaggedError` — no serialization needed)
- `Effect.tryPromise` to wrap promise-returning code
- `Effect.runPromise` at the call boundary
- Operators for timeouts, retries, caching, concurrency, pattern matching

---

## Service Pattern

### Defining Services

Services use `ServiceMap.Service` (the ami-next variant of `Effect.Service`):

```typescript
export class Tasks extends ServiceMap.Service<Tasks>()("@ami/Tasks", {
  make: Effect.gen(function* () {
    const taskRepo = yield* TaskRepo;
    const projects = yield* Projects;

    const get = Effect.fn("Tasks.get")(function* (taskId: TaskId) {
      yield* Effect.annotateCurrentSpan({ taskId });
      return yield* taskRepo.findById(taskId);
    });

    const create = Effect.fn("Tasks.create")(function* (input: { ... }) {
      // ...implementation
    });

    return { get, create, /* ... */ } as const;
  }),
}) {
  static layer = Layer.effect(this)(this.make).pipe(
    Layer.provide(TaskRepo.layer),
    Layer.provide(Projects.layer),
  );
}
```

### Key Conventions

| Convention             | Detail                                                           |
| ---------------------- | ---------------------------------------------------------------- |
| **Service tag naming** | `"@ami/ServiceName"` or `"ServiceName"`                          |
| **Method wrapping**    | Every method uses `Effect.fn("Service.method")`                  |
| **Return**             | `return { ... } as const` — explicit public API                  |
| **Layer**              | Static `layer` property with `Layer.provide` for each dependency |
| **Test layer**         | Optionally `static layerTest` for testing                        |
| **Dependencies**       | Yielded at service construction time, not per-method             |

### Interface-First Services

For abstract services (e.g., `CodingAgent`), define the interface in the class generic:

```typescript
export class CodingAgent extends ServiceMap.Service<
  CodingAgent,
  {
    readonly sendMessage: (
      sessionId: SessionId,
      content: string,
    ) => Effect.Effect<void, AgentError>;
    readonly waitForIdle: (sessionId: SessionId) => Effect.Effect<void, AgentError>;
    readonly abort: (sessionId: SessionId) => Effect.Effect<void, never>;
  }
>()("CodingAgent") {}
```

---

## Error Pattern

### Error Definition

All errors use `Schema.ErrorClass` with explicit `_tag`:

```typescript
export class TaskNotFoundError extends Schema.ErrorClass<TaskNotFoundError>("TaskNotFoundError")({
  _tag: Schema.tag("TaskNotFoundError"),
  taskId: TaskId,
}) {
  message = `Task not found: ${this.taskId}`;
}
```

### Conventions

| Convention           | Detail                                                                           |
| -------------------- | -------------------------------------------------------------------------------- |
| **Naming**           | `{Entity}{Reason}Error` — e.g., `TaskNotFoundError`, `ProjectAlreadyExistsError` |
| **Fields**           | Always include the relevant entity ID(s)                                         |
| **Message**          | Computed `message` getter using template literal with error fields               |
| **Specificity**      | One error per failure mode — never collapse to generic `NotFoundError`           |
| **`_tag`**           | Always `Schema.tag("ErrorClassName")` — enables `catchTag`                       |
| **RPC error unions** | `Schema.Union([ErrorA, ErrorB, ...])` for RPC error types                        |

### Error Handling

```typescript
// Single tag
Effect.catchTag("CommentNotFoundError", () => Effect.succeed(Option.none()));

// Multiple tags — infrastructure errors become defects
Effect.catchTags({ PlatformError: Effect.die, SqlError: Effect.die, SchemaError: Effect.die });
```

### Error Remapping Rules

- Infrastructure errors (`SqlError`, `PlatformError`, `SchemaError`) → `Effect.die` (defects)
- Domain errors → `catchTag`/`catchTags` with specific handling
- Never `catchAll` — preserves type narrowing
- Never `mapError` — use `catchTag` instead

---

## Schema & Model Pattern

### Branded IDs

Every entity ID is branded for compile-time type safety:

```typescript
export const TaskId = Schema.String.pipe(Schema.brand("TaskId"));
export type TaskId = typeof TaskId.Type;
```

The codebase uses `Schema.String` (not `Schema.UUID`) as the base — IDs may not always be UUIDs.

### Model.Class for DB Entities

```typescript
export class Task extends Model.Class<Task>("Task")({
  id: Model.GeneratedByApp(TaskId),
  title: Schema.NonEmptyString,
  projectId: ProjectId,
  status: Model.JsonFromString(TaskStatus),
  description: Schema.String,
  agent: Model.GeneratedByApp(Schema.fromJsonString(CliAgent)),
  machineSnapshot: Model.FieldOption(Schema.String),
  createdAt: Model.DateTimeInsert,
  updatedAt: Model.DateTimeUpdate,
}) {
  get slug() {
    return Task.slug(this.title, this.id);
  }
  get isTerminalState() {
    return this.status._tag === "Merged" || this.status._tag === "Closed";
  }
}
```

### Model Helpers

| Helper                         | Purpose                                |
| ------------------------------ | -------------------------------------- |
| `Model.GeneratedByApp(schema)` | App-generated field (not DB-generated) |
| `Model.DateTimeInsert`         | Timestamp set on insert                |
| `Model.DateTimeUpdate`         | Timestamp updated on every write       |
| `Model.JsonFromString(schema)` | JSON column decoded to schema type     |
| `Model.FieldOption(schema)`    | Optional field mapped to `Option<T>`   |

### Schema.TaggedClass for Domain Events

```typescript
export class TaskUpdated extends Schema.TaggedClass<TaskUpdated>()("TaskUpdated", {
  taskId: TaskId,
  status: TaskStatus,
}) {
  get message() {
    return `Task status changed to ${this.status._tag}`;
  }
}
```

### Schema.TaggedStruct for Enum-like Unions

```typescript
export const Draft = Schema.TaggedStruct("Draft", {});
export const Open = Schema.TaggedStruct("Open", {});
export const Merged = Schema.TaggedStruct("Merged", {});

const TaskStatusSchema = Schema.Union([Draft, Open, Merged, Closed]);
export const TaskStatus = Object.assign(TaskStatusSchema, {
  Draft: () => Draft.makeUnsafe({}),
  Open: () => Open.makeUnsafe({}),
});
```

### Schema.Class for Value Objects

```typescript
export class Diff extends Schema.Class<Diff>("@ami/Diff")({
  change: ChangeType,
  diff: DiffValue,
  comments: Schema.Array(TextComment),
  commitHash: Schema.Option(CommitHash),
}) {
  get hasComments() {
    return this.comments.length > 0;
  }
  attachComments(comment: Comment) {
    /* immutable update */
  }
  get stats() {
    /* computed additions/deletions */
  }
}
```

---

## Layer Composition

### Service Layers

Each service defines its own `static layer`:

```typescript
static layer = Layer.effect(this)(this.make).pipe(
  Layer.provide(TaskRepo.layer),
  Layer.provide(Projects.layer),
  Layer.provide(NodeServices.layer),
);
```

### Infrastructure Layer

Composed at the app root with `Layer.provideMerge`:

```typescript
export const layerServerDev = (verbose = false) =>
  MigrationsLayer.pipe(
    Layer.provideMerge(SqlClientDev),
    Layer.provideMerge(KeyValueStoreLive),
    Layer.provideMerge(Layer.succeed(References.MinimumLogLevel)(verbose ? "All" : "Error")),
    Layer.provideMerge(Logger.layer([Logger.consolePretty(), AgentLogger("Backend")])),
  );
```

### RPC Router Layer

```typescript
export const AmiRpcsLive = Layer.mergeAll(
  TasksRpcsLive,
  TaskRunnerRpcsLive,
  ProjectsRpcsLive,
  TerminalsRpcsLive,
  ReviewRpcsLive,
  UpdatesRpcsLive,
  ClaudeCodeRpcsLive,
);
```

### Server Stack

```typescript
export const layerServer = (options) =>
  RpcLive.pipe(
    Layer.provideMerge(HttpRouter.serve(RpcLive)),
    Layer.provide(NodeHttpServer.layer(() => createServer(), { port })),
    Layer.provide(RpcSerialization.layerNdjson),
    Layer.provide(NodeServices.layer),
    Layer.provide(HttpRouter.cors({ ... })),
    Layer.provide(Observability.layer),
    Layer.provide(SessionAnalyticsLayer),
    Layer.provide(layerServerDev(options.verbose)),
  );
```

---

## RPC Pattern

### Shared Definitions

```typescript
const TasksRpcsBase = RpcGroup.make(
  Rpc.make("GetTask", { success: Task, error: TasksError, payload: { taskId: TaskId } }),
  Rpc.make("CreateTask", {
    success: Task,
    error: TasksError,
    payload: { taskId: TaskId, projectId: ProjectId, description: Schema.NonEmptyString },
  }),
);
export const TasksRpcs = TasksRpcsBase.prefix("tasks.");
```

### Streaming RPCs

```typescript
Rpc.make("StreamTerminalOutput", {
  success: Schema.String,
  error: TerminalsError,
  payload: { taskId: TaskId },
  stream: true,   // Marks as streaming
}),
```

### Backend Handler Layer

```typescript
export const TasksRpcsLive = TasksRpcs.toLayer(
  Effect.gen(function* () {
    const tasks = yield* Tasks;
    const obs = yield* Observability;
    return TasksRpcs.of({
      "tasks.GetTask": (req) => tasks.get(req.taskId).pipe(obs.tapCause("GetTask RPC failed", { taskId: req.taskId })),
      "tasks.CreateTask": (req) => tasks.create({ ... }).pipe(
        Effect.catchTags({ PlatformError: Effect.die, TaskRepoAlreadyExistsError: Effect.die }),
        obs.tapCause("CreateTask RPC failed", { ... }),
      ),
    });
  }),
).pipe(Layer.provide(Tasks.layer));
```

### Streaming Handler

```typescript
"updates.StreamUpdates": () =>
  Stream.unwrap(
    Effect.gen(function* () {
      return yield* updates.stream();
    }),
  ),
```

### Frontend Client

```typescript
export class AmiClient extends AtomRpc.Service<AmiClient>()("AmiClient", {
  group: AmiRpcs,
  protocol, // WebSocket via RpcClient.layerProtocolSocket()
}) {}

export const AmiRuntime = Atom.runtime(AmiDev);
```

---

## Atom Pattern (Frontend State)

### Query Atoms

```typescript
export const tasksAtom = AmiRuntime.atom(
  Effect.fnUntraced(
    function* (get: Atom.Context) {
      const projectId = yield* get.some(currentProjectIdAtom);
      const client = yield* AmiClient;
      return yield* client("tasks.ListTasks", { projectId });
    },
    Effect.annotateLogs({ atom: "tasksAtom" }),
  ),
);
```

### Mutation Functions

```typescript
export const deleteTaskFn = AmiRuntime.fn(
  Effect.fnUntraced(
    function* (args: { readonly taskId: TaskId }, ctx: Atom.FnContext) {
      const client = yield* AmiClient;
      yield* client("tasks.DeleteTask", args);
      ctx.refresh(tasksAtom);
    },
    Effect.tapCause((cause) => Effect.logError("Failed to delete task", cause)),
    Effect.annotateLogs({ fn: "deleteTaskFn" }),
  ),
);
```

### Optimistic Updates

```typescript
export const optimisticTasksAtom = tasksAtom.pipe(Atom.optimistic);
export const createTaskFn = optimisticTasksAtom.pipe(
  Atom.optimisticFn({
    reducer: (currentTasks, args) =>
      AsyncResult.map(currentTasks, (tasks) => [args.optimisticTask, ...tasks]),
    fn: _createTaskFn,
  }),
);
```

### Persisted State (localStorage)

```typescript
export const currentProjectIdAtom = Atom.kvs({
  key: "ami-next:projectId",
  runtime: Atom.runtime(BrowserKeyValueStore.layerLocalStorage),
  schema: Schema.Option(ProjectId),
  defaultValue: () => Option.none(),
});
```

### Writable Atom Family (Chat State)

Source atom fetches from backend, writable wrapper allows optimistic local writes:

```typescript
export const chatStateFamily = Atom.family((taskId: TaskId) => {
  const sourceAtom = AmiRuntime.atom(
    Effect.fnUntraced(function* () {
      const client = yield* AmiClient;
      const messages = yield* client("claudeCode.StreamMessages", { taskId }).pipe(
        Stream.runCollect,
        Effect.map(Arr.map((line) => line.toMessageWithParts)),
        Effect.map(Arr.getSomes),
      );
      return new ChatState({ status: "Idle", messages });
    }),
  ).pipe(Atom.keepAlive);

  return Atom.writable(
    (ctx) => {
      ctx.subscribe(sourceAtom, (value) => ctx.setSelf(value));
      return ctx.once(sourceAtom);
    },
    (ctx, value) => {
      ctx.setSelf(value);
    },
  ).pipe(Atom.keepAlive);
});
```

### Conventions

| Convention                              | Detail                           |
| --------------------------------------- | -------------------------------- |
| `xxxAtom` / `xxxFn`                     | Query atoms / mutation functions |
| `Effect.fnUntraced`                     | No tracing overhead in frontend  |
| `Effect.annotateLogs({ atom: "name" })` | Every atom/fn annotated          |
| `ctx.refresh(atom)`                     | Invalidate after mutations       |
| `yield* get.some(atom)`                 | Unwrap `Option` atom             |
| `yield* ctx.result(atom)`               | Unwrap `AsyncResult` atom        |
| `Atom.keepAlive`                        | Persist across unmounts          |

---

## Observability

### Observability Service

```typescript
export class Observability extends ServiceMap.Service<Observability>()("@ami/Observability", {
  make: Effect.gen(function* () {
    const analytics = yield* Analytics;
    const orDie = <A, E, R>(self: Effect.Effect<A, E, R>) =>
      self.pipe(
        Effect.tapCause((cause) => analytics.capture("error:unexpected", captureErrorProps(cause))),
        Effect.orDie,
      );
    const tapCause =
      (...messageParts) =>
      <A, E, R>(effect: Effect.Effect<A, E, R>) =>
        effect.pipe(
          Effect.tapCause((cause) =>
            Effect.all(
              [
                analytics.capture("error:expected", captureErrorProps(cause)),
                Effect.logError(...messageParts, cause),
              ],
              { discard: true },
            ),
          ),
        );
    return { orDie, streamOrDie, tapCause } as const;
  }),
}) {}
```

---

## SQL Repository Pattern

### SqlModel.makeRepository

Auto-generates CRUD from a `Model.Class`:

```typescript
export class TaskRepo extends ServiceMap.Service<TaskRepo>()("TaskRepo", {
  make: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const repo = yield* SqlModel.makeRepository(Task, {
      tableName: "tasks",
      idColumn: "id",
      spanPrefix: "TaskRepo",
    });

    const findById = (id: TaskId) =>
      repo.findById(id).pipe(
        Effect.catchTag("NoSuchElementError", () =>
          new TaskNotFoundError({ taskId: id }).asEffect(),
        ),
        Effect.catchTags({ SchemaError: Effect.die, SqlError: Effect.die }),
      );

    const findByProject = SqlSchema.findAll({
      Request: Schema.Struct({ projectId: ProjectId }),
      Result: Task,
      execute: (req) =>
        sql`SELECT * FROM tasks WHERE project_id = ${req.projectId} ORDER BY created_at DESC`,
    });

    return { findById, findAll, insert, update, findByProject, deleteById } as const;
  }),
}) {
  static layer = Layer.effect(this)(this.make);
}
```

### SqlSchema Helpers

| API                                               | Purpose                    |
| ------------------------------------------------- | -------------------------- |
| `SqlModel.makeRepository(Model, opts)`            | Auto-CRUD from Model.Class |
| `SqlSchema.findAll({ Request, Result, execute })` | Typed multi-row query      |
| `SqlSchema.findOne({ Request, Result, execute })` | Typed single-row query     |
| `SqlSchema.void({ Request, execute })`            | Typed void query           |

### Error Handling Pattern

Always: `NoSuchElementError` → domain error, `SqlError`/`SchemaError` → `Effect.die`.

### Insert/Update Types from Model.Class

- `Task.insert.Type` — includes all fields except auto-generated timestamps
- `Task.update.Type` — all fields optional except `id`
- `Task.insert.makeUnsafe({...})` — bypasses validation for trusted data

### Spread Repo for Simple Cases

```typescript
return { ...repo, findByTaskId } as const;
```

---

## Migration Pattern

```typescript
// 0001_projects.ts
export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`;
});

// index.ts
const loader = Migrator.fromRecord({
  "0001_projects": _0001_projects.default,
  "0002_tasks": _0002_tasks.default,
});

export const migrations = Migrator.make({})({ loader }).pipe(
  Effect.tap((applied) => Effect.logInfo(`Applied ${applied.length} migrations`)),
);
```

Runs as `Layer.effectDiscard(Migrations.migrations)` before services start.

---

## PubSub & Real-Time Streaming

### PubSub for Event Broadcasting

```typescript
const pubsub = yield* PubSub.unbounded<Update>();

const create = Effect.fn("Updates.create")(function* (taskId, content, options) {
  const update = options?.ephemeral
    ? Update.makeUnsafe({ ... })           // Not persisted to DB
    : yield* repo.insert(Update.insert.makeUnsafe({ ... }));
  yield* PubSub.publish(pubsub, update);
});

const stream = Effect.fn("Updates.stream")(function* () {
  return Stream.fromPubSub(pubsub);
});
```

### Ephemeral vs Persisted

- **Ephemeral**: `ToolCallProgress`, `MessageEvent`, `StreamingStarted/Stopped` — transient UI events
- **Persisted**: `TaskUpdated`, `ReviewRequested` — durable state changes stored in DB

### Terminal PubSub with Replay

```typescript
const pubsub = yield * PubSub.unbounded<string>({ replay: 10_000 });
terminal.onData((data) => PubSub.publishUnsafe(pubsub, data));
```

---

## FiberMap for Concurrent Task Management

### TaskRunner Pattern

```typescript
const runningIterations = yield * FiberMap.make<TaskId>();

const sendMessage = Effect.fn("TaskRunner.sendMessage")(function* (taskId, message) {
  yield* FiberMap.run(runningIterations, taskId, runIteration(taskId, message));
  // Starts fiber, auto-kills previous fiber with same key
});

const interrupt = Effect.fn("TaskRunner.interrupt")(function* (taskId) {
  yield* FiberMap.remove(runningIterations, taskId);
});
```

### Guard Against Double-Runs

```typescript
const isRunning = yield * FiberMap.has(runningIterations, taskId);
if (isRunning) return yield * Effect.logWarning(`Skipping (already running)`);
```

---

## Resource Management (acquireRelease, Scoped)

### Terminal PTY Lifecycle

```typescript
const terminal =
  yield *
  Effect.acquireRelease(
    Effect.try({
      try: () => pty.spawn(shell, [], { cwd, env }),
      catch: (cause) => new TerminalSpawnError({ taskId, cause }),
    }),
    (terminal) => Effect.sync(() => terminal.kill()),
  );

const pubsub =
  yield *
  Effect.acquireRelease(PubSub.unbounded<string>({ replay: 10_000 }), (ps) => PubSub.shutdown(ps));

yield * Effect.addFinalizer(() => Effect.sync(() => terminals.delete(taskId)));
yield * Effect.never; // Block forever — cleanup via fiber interruption
```

### Scoped Effects

```typescript
const runIteration = Effect.fn("TaskRunner.runIteration")(function* (taskId, message) {
  yield* Effect.addFinalizer(() =>
    tasks
      .updateStatus(task.id, task.baseStatus)
      .pipe(Effect.ignore({ log: "Warn", message: "Updating status failed" })),
  );
  // ... do work ...
}, Effect.scoped);
```

### Process Spawning

```typescript
export const runProcess = (cmd, options) =>
  Effect.gen(function* () {
    const handle = yield* options.spawner.spawn(ChildProcess.make(cmd, args, { cwd }));
    const [exitCode, stdout, stderr] = yield* Effect.all(
      [
        handle.exitCode,
        Stream.mkString(Stream.decodeText(handle.stdout)),
        Stream.mkString(Stream.decodeText(handle.stderr)),
      ],
      { concurrency: "unbounded" },
    );
    if (options.errorOnNonZero && exitCode !== 0) {
      return yield* new NonZeroExitCodeError({
        cmd,
        args,
        exitCode,
        output: (stderr || stdout).trim(),
      }).asEffect();
    }
    return { exitCode, stdout, stderr };
  }).pipe(Effect.scoped, Effect.catchTag("PlatformError", Effect.die));
```

---

## Analytics Pattern

### Never-Fail Guarantee

```typescript
const capture = (eventName, properties) =>
  Effect.gen(function* () {
    yield* provider.capture({ eventName, properties, distinctId });
  }).pipe(
    Effect.catchCause((cause) =>
      Effect.logWarning("Analytics capture failed", { eventName, cause }),
    ),
  );
```

### Session Lifecycle Tracking

```typescript
export const SessionAnalyticsLayer = Layer.effectDiscard(
  Effect.gen(function* () {
    const analytics = yield* Analytics;
    const startedAt = Date.now();
    yield* analytics.capture("session:started");
    yield* Effect.addFinalizer(() =>
      Effect.gen(function* () {
        yield* analytics.capture("session:ended", { session_ms: Date.now() - startedAt });
        yield* analytics.flush;
      }),
    );
  }),
);
```

### Track Pipe Operator

```typescript
const track = (eventName, deriveProperties?) => (self) =>
  Effect.tap(self, (result) => capture(eventName, deriveProperties?.(result)));
```

---

## ManagedRuntime Pattern (Next.js)

For API routes where you can't compose the full layer stack:

```typescript
const runtime = ManagedRuntime.make(rateLimiterLayer);

export async function POST(request: NextRequest) {
  const program = Effect.gen(function* () {
    const rateLimiter = yield* RateLimiter.RateLimiter;
    yield* rateLimiter.consume({
      key: `summarize:${ip}`,
      limit: 15,
      window: "1 hour",
      algorithm: "fixed-window",
      onExceeded: "fail",
    });
    // ... business logic
  }).pipe(
    Effect.map((response) => NextResponse.json(response)),
    Effect.catchTag("RateLimiterError", () =>
      Effect.succeed(NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })),
    ),
    Effect.catchTag("InvalidPayloadError", (e) =>
      Effect.succeed(NextResponse.json({ error: e.message }, { status: 400 })),
    ),
    Effect.catchCause(() =>
      Effect.succeed(NextResponse.json({ error: "Internal server error" }, { status: 500 })),
    ),
  );
  return await runtime.runPromise(program);
}
```

---

## Git Service — Dynamic Context Injection

### GitRepoRoot as Dynamic Context

```typescript
export const GitRepoRoot: ServiceMap.Service<string, string> = ServiceMap.Service("GitRepoRoot");

const raw = (options) => Effect.gen(function* () {
  const repoRoot = yield* GitRepoRoot;
  return yield* Effect.tryPromise({ try: () => simpleGit(repoRoot).raw(options.args), catch: (cause) => new GitError({ ... }) });
});
```

### Scoped Context Provision

Same service, different repos via `Effect.provideService`:

```typescript
yield *
  git
    .getChanges(ChangesFor.Branch({ base, branchName }))
    .pipe(Effect.provideService(GitRepoRoot, task.taskPath));

yield * git.pull(targetBranch).pipe(Effect.provideService(GitRepoRoot, task.projectId));
```

### Data.taggedEnum

```typescript
export type ChangesFor = Data.TaggedEnum<{
  WorkingTree: {};
  Branch: { branchName: string; base: string };
  Commit: { hash: CommitHash };
}>;
export const ChangesFor = Data.taggedEnum<ChangesFor>();

ChangesFor.Branch({ base: mergeBase, branchName: task.branchName });
```

### Chained catchTag Fallback

```typescript
const getMainBranch = Effect.fn("Git.getMainBranch")(function* () {
  return yield* raw({ args: ["symbolic-ref", "refs/remotes/origin/HEAD"], ... }).pipe(
    Effect.map((ref) => ref.replace("refs/remotes/origin/", "")),
    Effect.catchTag("GitError", () => git(...).pipe(Effect.as("main"))),
    Effect.catchTag("GitError", () => git(...).pipe(Effect.as("master"))),
    Effect.catchTag("GitError", () => Effect.succeed("main")),
  );
});
```

---

## Tagged Union Models (Update Content)

### Large Tagged Union

```typescript
export class ToolCallProgress extends Schema.TaggedClass<ToolCallProgress>()("ToolCallProgress", {
  id: Schema.String,
  taskId: TaskId,
  tool: Schema.String,
  title: Schema.optional(Schema.String),
  input: Schema.optional(Schema.Unknown),
}) {
  get displayName(): string {
    return pipe(
      Match.value(this.tool),
      Match.when("edit", () => "Editing"),
      Match.when("write", () => "Writing"),
      Match.when("bash", () => "Running"),
      Match.orElse((tool) => tool.charAt(0).toUpperCase() + tool.slice(1)),
    );
  }
}

export const UpdateContent = Schema.Union([
  TaskUpdated,
  CreatePlanFailed,
  ImplementationFailed,
  AgentRetrying,
  TaskErrored,
  ReviewRequested,
  AgentStreamFinished,
  ToolCallProgress,
  MessageEvent,
  StreamingStarted,
  StreamingStopped,
]);
```

Stored in DB as JSON via `Model.JsonFromString(UpdateContent)`.

---

## Frontend Pull Atoms (Streaming)

### AmiRuntime.pull

Subscribes to streaming RPC and accumulates/forwards values:

```typescript
export const terminalOutputAtom = AmiRuntime.pull(
  (get: Atom.Context) =>
    Stream.unwrap(
      Effect.gen(function* () {
        const task = yield* get.result(spawnTerminalAtom);
        const client = yield* AmiClient;
        return client("terminals.StreamTerminalOutput", { taskId: task.id });
      }),
    ),
  { disableAccumulation: true },
);
```

### Global Update Dispatcher

Single pull atom dispatches to multiple family atoms based on `_tag`:

```typescript
export const updatesAtom = AmiRuntime.pull(
  (get: Atom.Context) =>
    Stream.unwrap(
      Effect.gen(function* () {
        const client = yield* AmiClient;
        return client("updates.StreamUpdates", undefined).pipe(
          Stream.tap((update) =>
            Effect.sync(() => {
              if (update.value._tag === "ToolCallProgress") {
                get.set(taskUpdatesFamily(update.taskId), [
                  ...get.once(taskUpdatesFamily(update.taskId)),
                  update,
                ]);
              }
              if (update.value._tag === "MessageEvent") {
                get.set(
                  chatStateFamily(update.taskId),
                  AsyncResult.success(
                    ChatState.appendMessage(
                      get.once(chatStateFamily(update.taskId)),
                      update.value.message,
                    ),
                  ),
                );
              }
              if (update.value._tag === "StreamingStopped") {
                get.set(
                  chatStateFamily(update.taskId),
                  AsyncResult.success(
                    ChatState.updateStatus(get.once(chatStateFamily(update.taskId)), "Idle"),
                  ),
                );
              }
            }),
          ),
        );
      }),
    ),
  { disableAccumulation: true },
).pipe(Atom.keepAlive);
```

---

## Terminal Service Lifecycle

```
spawn → FiberMap.run → acquireRelease(pty, kill) → PubSub → Effect.never
                                                     ↓
                                           stream → Stream.fromPubSub
                                           write → pty.write
                                           resize → pty.resize
                                           kill → FiberMap.remove (triggers finalizers)
```

### Retry + Timeout for Terminal Readiness

```typescript
const waitForTerminal = Effect.fn("Terminals.waitForTerminal")(function* (taskId) {
  yield* get(taskId).pipe(
    Effect.retry(Schedule.spaced("25 millis")),
    Effect.timeout("30 seconds"),
    Effect.catchTag("TimeoutError", () => new TerminalTimeoutError({ taskId }).asEffect()),
  );
});
```

### Test Layer

```typescript
static layerTest = Layer.effect(this)(
  Effect.gen(function* () {
    const terminals = new Map<TaskId, TerminalState>();
    // Same API, no real PTY — PubSub streams are empty
    return { spawn, getOrCreate, stream, write, resize, kill, waitForTerminal };
  }),
);
```

---

## Utility Patterns

### Effect.option

Converts failure to `Option.none()`, success to `Option.some()`:

```typescript
const existing = yield * findByCommitHash(commitHash).pipe(Effect.option);
if (Option.isSome(existing)) {
  /* update */
} else {
  /* insert */
}
```

### Effect.flip

Swaps success/error — "fail if found" pattern:

```typescript
yield *
  get(taskId).pipe(
    Effect.flip,
    Effect.mapError(() => new TerminalAlreadyExistsError({ taskId })),
  );
```

### .asEffect()

Schema.ErrorClass instances have `.asEffect()`:

```typescript
return yield * new TaskNotFoundError({ taskId: id }).asEffect();
// Equivalent to: Effect.fail(new TaskNotFoundError({ taskId: id }))
```

### Effect.ignore with logging

```typescript
Effect.ignore({ log: "Warn", message: "Updating status failed" });
```

---

## Schema Type Hierarchy

| Type                  | Base                                    | Usage                               | Has `_tag`?    |
| --------------------- | --------------------------------------- | ----------------------------------- | -------------- |
| `Schema.TaggedClass`  | `Schema.TaggedClass<T>()("Tag", {...})` | Domain events, update content       | Yes (auto)     |
| `Schema.Class`        | `Schema.Class<T>("Name")({...})`        | Value objects (Diff, CodeRange)     | Optional       |
| `Schema.ErrorClass`   | `Schema.ErrorClass<T>("Name")({...})`   | Errors with `_tag: Schema.tag(...)` | Yes (explicit) |
| `Schema.TaggedStruct` | `Schema.TaggedStruct("Tag", {...})`     | Enum variants (TaskStatus)          | Yes (auto)     |
| `Model.Class`         | `Model.Class<T>("Name")({...})`         | DB-backed entities (Task, Project)  | No             |

---

## Anti-Patterns

| Pattern                                                | Reason                   | Correct                             |
| ------------------------------------------------------ | ------------------------ | ----------------------------------- |
| `Effect.runSync` / `Effect.runPromise` inside services | Breaks composition       | Return effects, run at boundary     |
| `throw` inside `Effect.gen`                            | Bypasses error channel   | `Effect.fail(new TaggedError(...))` |
| `catchAll`                                             | Loses type info          | `catchTag` / `catchTags`            |
| `console.log`                                          | Not structured           | `Effect.log`, `Effect.logInfo`      |
| `process.env`                                          | No validation            | `Config.string`, `Config.integer`   |
| `null` / `undefined` in domain types                   | Error-prone              | `Option<T>`                         |
| `Option.getOrThrow`                                    | Throws                   | `Option.match` / `Option.getOrElse` |
| `any` / `unknown` casts                                | Bypasses type safety     | `Schema.decodeUnknown`              |
| `Promise` in service signatures                        | Loses Effect composition | Return `Effect` types               |
| Mutable `let` without `Ref`                            | Race conditions          | `Ref.make` / `Ref.update`           |
| Creating atoms inside components                       | New atom each render     | Module-level definition             |
| Missing `Atom.keepAlive` for global state              | Resets on unmount        | Pipe with `Atom.keepAlive`          |
| Missing `get.addFinalizer()`                           | Memory leaks             | Always register cleanup             |

---

## Effect Version & Imports

**Version**: `4.0.0-beta.28`

| Module           | Import Path                                                                                                                        |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Core             | `effect` (`Effect`, `Layer`, `Schema`, `Option`, `ServiceMap`, `PubSub`, `FiberMap`, `Ref`, `Data`, `Match`, `Stream`, `Schedule`) |
| RPC              | `effect/unstable/rpc` (`Rpc`, `RpcGroup`, `RpcClient`, `RpcServer`, `RpcSerialization`)                                            |
| Reactivity       | `effect/unstable/reactivity` (`AsyncResult`, `Atom`, `AtomRpc`)                                                                    |
| Atom internals   | `effect/unstable/reactivity/Atom`                                                                                                  |
| HTTP             | `effect/unstable/http` (`HttpRouter`, `HttpClient`, `FetchHttpClient`)                                                             |
| SQL              | `effect/unstable/sql` (`SqlClient`, `SqlModel`, `SqlSchema`, `Migrator`)                                                           |
| Process          | `effect/unstable/process` (`ChildProcess`, `ChildProcessSpawner`)                                                                  |
| Persistence      | `effect/unstable/persistence` (`KeyValueStore`, `RateLimiter`)                                                                     |
| Socket           | `effect/unstable/socket` (`Socket`)                                                                                                |
| Model            | `effect/unstable/schema` (`Model`)                                                                                                 |
| Encoding         | `effect/unstable/encoding` (`Ndjson`)                                                                                              |
| FileSystem       | `effect/FileSystem`                                                                                                                |
| Platform Node    | `@effect/platform-node` (`NodeServices`, `NodeHttpServer`)                                                                         |
| Platform Browser | `@effect/platform-browser` (`BrowserKeyValueStore`)                                                                                |
| SQLite           | `@effect/sql-sqlite-node` (`SqliteClient`)                                                                                         |
| Atom React       | `@effect/atom-react` (`useAtomValue`, `useAtomSet`, `useAtom`)                                                                     |

### Key API Differences from Stable

- `ServiceMap.Service` instead of `Effect.Service` — variant with explicit make/layer
- `Schema.ErrorClass` instead of `Schema.TaggedError` — explicit `_tag: Schema.tag("Name")`
- `Model.Class` — ORM-style schema with DB field helpers
- `Schema.TaggedStruct` — lighter than `Schema.Class` for enum-like types
- `Atom.runtime(layer)` — replaces provider patterns
- `AtomRpc.Service` — RPC client with atom reactivity
- `Effect.fnUntraced` — like `Effect.fn` without span creation (frontend perf)
- `AmiRuntime.pull` — streaming atom that subscribes to RPC streams
- `Atom.writable` — read from source, accept local writes
- `Atom.optimistic` / `Atom.optimisticFn` — optimistic UI updates
