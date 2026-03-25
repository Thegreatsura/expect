import { describe, expect, it, vi, beforeEach, afterEach } from "vite-plus/test";
import { execSync } from "node:child_process";
import { detectPackageManager, runInit } from "../src/commands/init";

const succeedSpy = vi.fn();
const failSpy = vi.fn();

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

vi.mock("../src/utils/spinner", () => ({
  spinner: () => ({
    start: () => ({
      succeed: succeedSpy,
      fail: failSpy,
    }),
  }),
}));

vi.mock("../src/utils/prompts", () => ({
  prompts: vi.fn().mockResolvedValue({ installSkill: false }),
}));

const mockedExecSync = vi.mocked(execSync);

describe("init", () => {
  describe("detectPackageManager", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      delete process.env.VITE_PLUS_CLI_BIN;
      delete process.env.npm_config_user_agent;
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("detects vp from VITE_PLUS_CLI_BIN", () => {
      process.env.VITE_PLUS_CLI_BIN = "/usr/local/bin/vp";
      expect(detectPackageManager()).toBe("vp");
    });

    it("prioritizes vp over npm_config_user_agent", () => {
      process.env.VITE_PLUS_CLI_BIN = "/usr/local/bin/vp";
      process.env.npm_config_user_agent = "npm/10.0.0 node/v20.0.0";
      expect(detectPackageManager()).toBe("vp");
    });

    it("detects npm from user agent", () => {
      process.env.npm_config_user_agent = "npm/10.0.0 node/v20.0.0";
      expect(detectPackageManager()).toBe("npm");
    });

    it("detects pnpm from user agent", () => {
      process.env.npm_config_user_agent = "pnpm/8.15.0 node/v20.0.0";
      expect(detectPackageManager()).toBe("pnpm");
    });

    it("detects yarn from user agent", () => {
      process.env.npm_config_user_agent = "yarn/4.0.0 node/v20.0.0";
      expect(detectPackageManager()).toBe("yarn");
    });

    it("detects bun from user agent", () => {
      process.env.npm_config_user_agent = "bun/1.0.0 node/v20.0.0";
      expect(detectPackageManager()).toBe("bun");
    });

    it("falls back to npm when no env vars set", () => {
      expect(detectPackageManager()).toBe("npm");
    });
  });

  describe("runInit", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      delete process.env.VITE_PLUS_CLI_BIN;
      delete process.env.npm_config_user_agent;
      vi.clearAllMocks();
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("global install command uses the detected package manager binary", async () => {
      process.env.npm_config_user_agent = "pnpm/8.15.0 node/v20.0.0";
      await runInit({ yes: true });

      const firstCall = String(mockedExecSync.mock.calls[0][0]);
      expect(firstCall).toMatch(/^pnpm /);
      expect(firstCall).toContain("-g");
      expect(firstCall).toContain("expect-cli");
    });

    it("uses vp binary when VITE_PLUS_CLI_BIN is set", async () => {
      process.env.VITE_PLUS_CLI_BIN = "/usr/local/bin/vp";
      await runInit({ yes: true });

      const firstCall = String(mockedExecSync.mock.calls[0][0]);
      expect(firstCall).toMatch(/^vp /);
      expect(firstCall).toContain("-g");
    });

    it("runs both global install and skill install", async () => {
      await runInit({ yes: true });

      const calls = mockedExecSync.mock.calls.map((call) => String(call[0]));
      expect(calls.length).toBeGreaterThanOrEqual(2);
      expect(calls[0]).toContain("-g");
      expect(calls[1]).toContain("skills add");
    });

    it("continues to skill install even when global install fails", async () => {
      mockedExecSync.mockImplementationOnce(() => {
        throw new Error("install failed");
      });

      await runInit({ yes: true });

      const calls = mockedExecSync.mock.calls.map((call) => String(call[0]));
      expect(calls.length).toBeGreaterThanOrEqual(2);
      expect(calls[1]).toContain("skills add");
    });

    it("shows spinner success when install succeeds", async () => {
      await runInit({ yes: true });

      expect(succeedSpy).toHaveBeenCalled();
    });

    it("shows spinner fail when install throws", async () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error("install failed");
      });

      await runInit({ yes: true });

      expect(failSpy).toHaveBeenCalled();
    });

    it("does not call prompts in non-interactive mode", async () => {
      const { prompts } = await import("../src/utils/prompts");
      await runInit({ yes: true });

      expect(prompts).not.toHaveBeenCalled();
    });
  });
});
