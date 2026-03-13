export interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface AgentProviderSettings {
  cwd?: string;
  sessionId?: string;
  env?: Record<string, string>;
  mcpServers?: Record<string, McpServerConfig>;
}
