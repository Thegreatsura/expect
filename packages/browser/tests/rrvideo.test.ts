import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Effect } from "effect";
import { describe, expect, it, afterEach } from "vite-plus/test";
import { RrVideo, RrVideoConvertError } from "../src/rrvideo";

const TEMP_DIR_PREFIX = "rrvideo-test-";

const makeMetaEvent = (timestamp: number, width: number, height: number) => ({
  type: 4,
  timestamp,
  data: { href: "about:blank", width, height },
});

const makeFullSnapshotEvent = (timestamp: number) => ({
  type: 2,
  timestamp,
  data: {
    node: {
      type: 0,
      childNodes: [
        {
          type: 1,
          name: "html",
          publicId: "",
          systemId: "",
        },
        {
          type: 2,
          tagName: "html",
          attributes: {},
          childNodes: [
            {
              type: 2,
              tagName: "head",
              attributes: {},
              childNodes: [],
            },
            {
              type: 2,
              tagName: "body",
              attributes: {},
              childNodes: [
                {
                  type: 2,
                  tagName: "div",
                  attributes: { id: "app" },
                  childNodes: [
                    {
                      type: 3,
                      textContent: "Hello World",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    initialOffset: { top: 0, left: 0 },
  },
});

const makeMinimalSession = (durationMs = 500, width = 800, height = 600) => {
  const startTime = 1700000000000;
  return [
    makeMetaEvent(startTime, width, height),
    makeFullSnapshotEvent(startTime + 1),
    makeMetaEvent(startTime + durationMs, width, height),
  ];
};

const writeSessionFile = (dir: string, filename: string, events: unknown[]) => {
  const sessionPath = join(dir, filename);
  writeFileSync(sessionPath, JSON.stringify(events));
  return sessionPath;
};

interface ConvertOptions {
  readonly inputPath: string;
  readonly outputPath: string;
  readonly resolutionRatio?: number;
  readonly onProgress?: (percent: number) => void;
  readonly speed?: number;
  readonly skipInactive?: boolean;
}

const runConvert = (options: ConvertOptions) =>
  Effect.gen(function* () {
    const rrvideo = yield* RrVideo;
    return yield* rrvideo.convert(options);
  }).pipe(Effect.provide(RrVideo.layer), Effect.runPromise);

const runConvertExit = (options: ConvertOptions) =>
  Effect.gen(function* () {
    const rrvideo = yield* RrVideo;
    return yield* rrvideo.convert(options);
  }).pipe(Effect.provide(RrVideo.layer), Effect.runPromiseExit);

describe("RrVideo", () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  describe("convert — success cases", () => {
    it("converts a minimal rrweb session to an MP4 file", async () => {
      tempDir = mkdtempSync(join(tmpdir(), TEMP_DIR_PREFIX));
      const events = makeMinimalSession();
      const inputPath = writeSessionFile(tempDir, "session.json", events);
      const outputPath = join(tempDir, "output.mp4");

      const result = await runConvert({ inputPath, outputPath, speed: 8 });

      expect(result).toBe(outputPath);
      expect(existsSync(outputPath)).toBe(true);
    }, 30_000);

    it("creates output directory if it does not exist", async () => {
      tempDir = mkdtempSync(join(tmpdir(), TEMP_DIR_PREFIX));
      const events = makeMinimalSession();
      const inputPath = writeSessionFile(tempDir, "session.json", events);
      const outputPath = join(tempDir, "nested", "deep", "output.mp4");

      const result = await runConvert({ inputPath, outputPath, speed: 8 });

      expect(result).toBe(outputPath);
      expect(existsSync(outputPath)).toBe(true);
    }, 30_000);

    it("respects custom resolution ratio", async () => {
      tempDir = mkdtempSync(join(tmpdir(), TEMP_DIR_PREFIX));
      const events = makeMinimalSession(500, 1280, 720);
      const inputPath = writeSessionFile(tempDir, "session.json", events);
      const outputPath = join(tempDir, "low-res.mp4");

      const result = await runConvert({
        inputPath,
        outputPath,
        resolutionRatio: 0.5,
        speed: 8,
      });

      expect(result).toBe(outputPath);
      expect(existsSync(outputPath)).toBe(true);
    }, 30_000);

    it("calls onProgress during replay", async () => {
      tempDir = mkdtempSync(join(tmpdir(), TEMP_DIR_PREFIX));
      const events = makeMinimalSession(1000);
      const inputPath = writeSessionFile(tempDir, "session.json", events);
      const outputPath = join(tempDir, "progress.mp4");
      const progressValues: number[] = [];

      await runConvert({
        inputPath,
        outputPath,
        speed: 8,
        onProgress: (percent) => progressValues.push(percent),
      });

      expect(progressValues.length).toBeGreaterThan(0);
      for (const value of progressValues) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }, 30_000);

    it("handles skipInactive option", async () => {
      tempDir = mkdtempSync(join(tmpdir(), TEMP_DIR_PREFIX));
      const events = makeMinimalSession();
      const inputPath = writeSessionFile(tempDir, "session.json", events);
      const outputPath = join(tempDir, "skip-inactive.mp4");

      const result = await runConvert({
        inputPath,
        outputPath,
        skipInactive: true,
        speed: 8,
      });

      expect(result).toBe(outputPath);
      expect(existsSync(outputPath)).toBe(true);
    }, 30_000);
  });

  describe("convert — error cases", () => {
    it("fails with RrVideoConvertError for nonexistent input file", async () => {
      tempDir = mkdtempSync(join(tmpdir(), TEMP_DIR_PREFIX));
      const outputPath = join(tempDir, "output.mp4");

      const result = await runConvertExit({
        inputPath: "/nonexistent/path/session.json",
        outputPath,
      });

      expect(result._tag).toBe("Failure");
      if (result._tag === "Failure") {
        expect(String(result.cause)).toContain("RrVideoConvertError");
        expect(String(result.cause)).toContain("Failed to read input");
      }
    });

    it("fails with RrVideoConvertError for invalid JSON", async () => {
      tempDir = mkdtempSync(join(tmpdir(), TEMP_DIR_PREFIX));
      const inputPath = join(tempDir, "bad.json");
      writeFileSync(inputPath, "not valid json {{{");
      const outputPath = join(tempDir, "output.mp4");

      const result = await runConvertExit({ inputPath, outputPath });

      expect(result._tag).toBe("Failure");
      if (result._tag === "Failure") {
        expect(String(result.cause)).toContain("RrVideoConvertError");
        expect(String(result.cause)).toContain("Failed to parse events");
      }
    });

    it("fails with RrVideoConvertError when JSON is not an array", async () => {
      tempDir = mkdtempSync(join(tmpdir(), TEMP_DIR_PREFIX));
      const inputPath = join(tempDir, "object.json");
      writeFileSync(inputPath, JSON.stringify({ type: 4, timestamp: 1000 }));
      const outputPath = join(tempDir, "output.mp4");

      const result = await runConvertExit({ inputPath, outputPath });

      expect(result._tag).toBe("Failure");
      if (result._tag === "Failure") {
        expect(String(result.cause)).toContain("RrVideoConvertError");
        expect(String(result.cause)).toContain("must contain a JSON array");
      }
    });

    it("fails with RrVideoConvertError when events have invalid shape", async () => {
      tempDir = mkdtempSync(join(tmpdir(), TEMP_DIR_PREFIX));
      const events = [
        { type: 4, timestamp: 1000, data: { width: 800, height: 600 } },
        { notType: "bad", notTimestamp: "bad" },
      ];
      const inputPath = writeSessionFile(tempDir, "bad-shape.json", events);
      const outputPath = join(tempDir, "output.mp4");

      const result = await runConvertExit({ inputPath, outputPath });

      expect(result._tag).toBe("Failure");
      if (result._tag === "Failure") {
        expect(String(result.cause)).toContain("RrVideoConvertError");
        expect(String(result.cause)).toContain("'type' (number) and 'timestamp' (number)");
      }
    });

    it("fails with RrVideoConvertError for empty events array", async () => {
      tempDir = mkdtempSync(join(tmpdir(), TEMP_DIR_PREFIX));
      const inputPath = writeSessionFile(tempDir, "empty.json", []);
      const outputPath = join(tempDir, "output.mp4");

      const result = await runConvertExit({ inputPath, outputPath });

      expect(result._tag).toBe("Failure");
      if (result._tag === "Failure") {
        expect(String(result.cause)).toContain("RrVideoConvertError");
        expect(String(result.cause)).toContain("No events in session file");
      }
    });

    it("fails with RrVideoConvertError when no meta events provide viewport", async () => {
      tempDir = mkdtempSync(join(tmpdir(), TEMP_DIR_PREFIX));
      const events = [
        { type: 2, timestamp: 1000, data: {} },
        { type: 3, timestamp: 2000, data: {} },
      ];
      const inputPath = writeSessionFile(tempDir, "no-viewport.json", events);
      const outputPath = join(tempDir, "output.mp4");

      const result = await runConvertExit({ inputPath, outputPath });

      expect(result._tag).toBe("Failure");
      if (result._tag === "Failure") {
        expect(String(result.cause)).toContain("RrVideoConvertError");
        expect(String(result.cause)).toContain("Could not determine viewport size");
      }
    });

    it("fails with RrVideoConvertError when viewport has zero dimensions", async () => {
      tempDir = mkdtempSync(join(tmpdir(), TEMP_DIR_PREFIX));
      const events = [
        { type: 4, timestamp: 1000, data: { width: 0, height: 0 } },
        { type: 2, timestamp: 2000, data: {} },
      ];
      const inputPath = writeSessionFile(tempDir, "zero-viewport.json", events);
      const outputPath = join(tempDir, "output.mp4");

      const result = await runConvertExit({ inputPath, outputPath });

      expect(result._tag).toBe("Failure");
      if (result._tag === "Failure") {
        expect(String(result.cause)).toContain("Could not determine viewport size");
      }
    });
  });

  describe("convert — cleans up temp resources", () => {
    it("does not leave temp directories after successful conversion", async () => {
      tempDir = mkdtempSync(join(tmpdir(), TEMP_DIR_PREFIX));
      const events = makeMinimalSession();
      const inputPath = writeSessionFile(tempDir, "session.json", events);
      const outputPath = join(tempDir, "output.mp4");

      await runConvert({ inputPath, outputPath, speed: 8 });

      const entries = await import("node:fs/promises").then((fs) => fs.readdir(tempDir));
      const tempDirs = entries.filter((entry) => entry.startsWith("rrvideo-"));
      expect(tempDirs).toHaveLength(0);
    }, 30_000);

    it("cleans up temp resources even when conversion fails", async () => {
      tempDir = mkdtempSync(join(tmpdir(), TEMP_DIR_PREFIX));
      const inputPath = writeSessionFile(tempDir, "empty.json", []);
      const outputPath = join(tempDir, "output.mp4");

      await runConvertExit({ inputPath, outputPath });

      expect(existsSync(outputPath)).toBe(false);
    });
  });

  describe("RrVideoConvertError", () => {
    it("formats message with cause", () => {
      const error = new RrVideoConvertError({ cause: "something broke" });

      expect(error.message).toBe("Failed to convert rrweb session to video: something broke");
      expect(error._tag).toBe("RrVideoConvertError");
    });
  });
});
