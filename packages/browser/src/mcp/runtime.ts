import { Layer, Logger, ManagedRuntime } from "effect";
import { NodeServices } from "@effect/platform-node";
import { McpSession } from "./mcp-session";

const StderrLoggerLayer = Layer.succeed(Logger.LogToStderr, true);

export const McpRuntime = ManagedRuntime.make(
  McpSession.layer.pipe(Layer.provide(StderrLoggerLayer), Layer.provide(NodeServices.layer)),
);
