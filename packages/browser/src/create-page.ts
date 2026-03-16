import {
  detectBrowserProfiles,
  detectDefaultBrowser,
  extractCookies,
  extractProfileCookies,
} from "@browser-tester/cookies";
import { tmpdir } from "node:os";
import type { Browser as BrowserKey, BrowserProfile, Cookie } from "@browser-tester/cookies";
import { chromium } from "playwright";
import {
  DEFAULT_VIDEO_HEIGHT_PX,
  DEFAULT_VIDEO_WIDTH_PX,
  HEADLESS_CHROMIUM_ARGS,
} from "./constants";
import { injectCookies } from "./inject-cookies";
import type { CreatePageOptions, CreatePageResult, VideoOptions } from "./types";

interface DefaultBrowserContext {
  defaultBrowser: BrowserKey | null;
  preferredProfile: BrowserProfile | null;
}

const EMPTY_DEFAULT_BROWSER_CONTEXT: DefaultBrowserContext = {
  defaultBrowser: null,
  preferredProfile: null,
};

const resolveDefaultBrowserContext = async (): Promise<DefaultBrowserContext> => {
  const defaultBrowser = await detectDefaultBrowser();
  if (!defaultBrowser) {
    return EMPTY_DEFAULT_BROWSER_CONTEXT;
  }

  const preferredProfile = detectBrowserProfiles({ browser: defaultBrowser })[0] ?? null;
  return { defaultBrowser, preferredProfile };
};

const extractDefaultBrowserCookies = async (
  url: string,
  defaultBrowserContext: DefaultBrowserContext,
): Promise<Cookie[]> => {
  const { defaultBrowser, preferredProfile } = defaultBrowserContext;

  if (preferredProfile) {
    const result = await extractProfileCookies({ profile: preferredProfile });
    if (result.cookies.length > 0) return result.cookies;
  }

  const browsers = defaultBrowser ? [defaultBrowser] : undefined;
  const result = await extractCookies({ url, browsers });
  return result.cookies;
};

const resolveVideoOptions = (
  video: boolean | VideoOptions | undefined,
): VideoOptions | undefined => {
  if (!video) return undefined;
  if (video === true) {
    return {
      dir: tmpdir(),
      size: { width: DEFAULT_VIDEO_WIDTH_PX, height: DEFAULT_VIDEO_HEIGHT_PX },
    };
  }
  return {
    ...video,
    size: video.size ?? {
      width: DEFAULT_VIDEO_WIDTH_PX,
      height: DEFAULT_VIDEO_HEIGHT_PX,
    },
  };
};

const resolveContextOptions = (video: VideoOptions | undefined, locale: string | undefined) => {
  if (!video && !locale) return undefined;

  return {
    ...(video ? { recordVideo: video } : {}),
    ...(locale ? { locale } : {}),
  };
};

const navigatePage = async (
  page: CreatePageResult["page"],
  url: string | undefined,
  waitUntil: CreatePageOptions["waitUntil"],
) => {
  if (!url) return;
  await page.goto(url, { waitUntil: waitUntil ?? "load" });
};

export const createPage = async (
  url: string | undefined,
  options: CreatePageOptions = {},
): Promise<CreatePageResult> => {
  const browser = await chromium.launch({
    headless: !options.headed,
    executablePath: options.executablePath,
    args: HEADLESS_CHROMIUM_ARGS,
  });

  try {
    const defaultBrowserContext =
      options.cookies === true
        ? await resolveDefaultBrowserContext()
        : EMPTY_DEFAULT_BROWSER_CONTEXT;
    const recordVideo = resolveVideoOptions(options.video);
    const context = await browser.newContext(
      resolveContextOptions(recordVideo, defaultBrowserContext.preferredProfile?.locale),
    );

    if (options.cookies) {
      const cookies = Array.isArray(options.cookies)
        ? options.cookies
        : await extractDefaultBrowserCookies(url ?? "", defaultBrowserContext);
      await injectCookies(context, cookies);
    }

    const page = await context.newPage();
    await navigatePage(page, url, options.waitUntil);

    return { browser, context, page };
  } catch (error) {
    await browser.close();
    throw error;
  }
};
