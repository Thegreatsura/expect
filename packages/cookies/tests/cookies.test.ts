import { accessSync, constants, existsSync } from "node:fs";
import { assert, describe, it } from "vite-plus/test";
import { Effect, Layer } from "effect";
import { Browsers } from "../src/browser-detector.js";
import { Cookies } from "../src/cookies.js";
import { layerLive } from "../src/layers.js";
import type { Cookie } from "../src/types.js";

const FIVE_MINUTES_MS = 300_000;

const CookiesTestLayer = Layer.mergeAll(layerLive, Cookies.layer);

const findCookie = (
  cookies: readonly { name: string; domain: string; expires?: number }[],
  name: string,
  domain: string,
) => cookies.find((cookie) => cookie.name === name && cookie.domain === domain);

const CHROME_EXECUTABLE = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FIREFOX_EXECUTABLE = "/Applications/Firefox.app/Contents/MacOS/firefox";
const DIA_EXECUTABLE = "/Applications/Dia.app/Contents/MacOS/Dia";
const SAFARI_COOKIE_PATH = `${process.env["HOME"]}/Library/Containers/com.apple.Safari/Data/Library/Cookies/Cookies.binarycookies`;

const canReadFile = (filePath: string) => {
  try {
    accessSync(filePath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
};

describe("Cookies", () => {
  it("extracts cookies from at least one detected browser", { timeout: FIVE_MINUTES_MS }, () =>
    Effect.gen(function* () {
      const browsers = yield* Browsers;
      const cookies = yield* Cookies;
      const allBrowsers = yield* browsers.list;

      assert.isAbove(allBrowsers.length, 0);

      const noCookies: readonly Cookie[] = [];
      let successCount = 0;
      for (const browser of allBrowsers) {
        const result = yield* Effect.suspend(() => cookies.extract(browser)).pipe(
          Effect.catchTags({
            ExtractionError: () => Effect.succeed(noCookies),
            PlatformError: () => Effect.succeed(noCookies),
          }),
        );
        if (result.length > 0) successCount += 1;
      }
      assert.isAbove(successCount, 0, "expected at least one browser to return cookies");
    }).pipe(Effect.scoped, Effect.provide(CookiesTestLayer), Effect.runPromise),
  );

  it.skipIf(!existsSync(DIA_EXECUTABLE))(
    "regression: works for Dia",
    { timeout: FIVE_MINUTES_MS },
    () =>
      Effect.gen(function* () {
        const browsers = yield* Browsers;
        const cookies = yield* Cookies;
        const allBrowsers = yield* browsers.list;

        const dia = allBrowsers.find(
          (browser) => browser._tag === "ChromiumBrowser" && browser.key === "dia",
        );
        assert.isDefined(dia);

        const result = yield* cookies.extract(dia!);
        assert.isArray(result);
      }).pipe(Effect.scoped, Effect.provide(CookiesTestLayer), Effect.runPromise),
  );

  it.skipIf(!existsSync(FIREFOX_EXECUTABLE))(
    "Firefox: __Secure-YEC on youtube.com has correct expiry",
    { timeout: FIVE_MINUTES_MS },
    () =>
      Effect.gen(function* () {
        const browsers = yield* Browsers;
        const cookies = yield* Cookies;
        const allBrowsers = yield* browsers.list;

        const firefox = allBrowsers.find((browser) => browser._tag === "FirefoxBrowser");
        assert.isDefined(firefox);

        const result = yield* cookies.extract(firefox!);
        const cookie = findCookie(result, "__Secure-YEC", "youtube.com");
        assert.isDefined(cookie, "cookie __Secure-YEC not found on youtube.com");
        assert.strictEqual(cookie!.expires, 1807799243);
      }).pipe(Effect.scoped, Effect.provide(CookiesTestLayer), Effect.runPromise),
  );

  it.skipIf(!canReadFile(SAFARI_COOKIE_PATH))(
    "Safari: APISID on youtube.com has correct expiry",
    { timeout: FIVE_MINUTES_MS },
    () =>
      Effect.gen(function* () {
        const browsers = yield* Browsers;
        const cookies = yield* Cookies;
        const allBrowsers = yield* browsers.list;

        const safari = allBrowsers.find((browser) => browser._tag === "SafariBrowser");
        assert.isDefined(safari);

        const result = yield* cookies.extract(safari!);
        const cookie = findCookie(result, "APISID", "youtube.com");
        assert.isDefined(cookie, "cookie APISID not found on youtube.com");
        assert.strictEqual(cookie!.expires, 1807102306);
      }).pipe(Effect.scoped, Effect.provide(CookiesTestLayer), Effect.runPromise),
  );

  it.skipIf(!existsSync(CHROME_EXECUTABLE))(
    "Chrome: APISID on google.com has correct expiry",
    { timeout: FIVE_MINUTES_MS },
    () =>
      Effect.gen(function* () {
        const browsers = yield* Browsers;
        const cookies = yield* Cookies;
        const allBrowsers = yield* browsers.list;

        const chrome = allBrowsers.find(
          (browser) => browser._tag === "ChromiumBrowser" && browser.key === "chrome",
        );
        assert.isDefined(chrome);

        const result = yield* cookies.extract(chrome!);
        const cookie = findCookie(result, "APISID", "google.com");
        assert.isDefined(cookie, "cookie APISID not found on google.com");
        assert.strictEqual(cookie!.expires, 1807347526);
      }).pipe(Effect.scoped, Effect.provide(CookiesTestLayer), Effect.runPromise),
  );
});
