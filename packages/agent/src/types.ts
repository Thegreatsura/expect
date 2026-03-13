export interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export type AgentPermissionMode =
  | "default"
  | "acceptEdits"
  | "bypassPermissions"
  | "plan"
  | "dontAsk";

export type AgentEffort = "low" | "medium" | "high" | "max";

export interface AgentProviderSettings {
  cwd?: string;
  sessionId?: string;
  env?: Record<string, string>;
  mcpServers?: Record<string, McpServerConfig>;
  permissionMode?: AgentPermissionMode;
  effort?: AgentEffort;
  tools?: string[];
  maxTurns?: number;
}
