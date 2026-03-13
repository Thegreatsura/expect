import { CookieJar } from "@browser-tester/cookies";
import type { Cookie } from "@browser-tester/cookies";
import type { BrowserContext } from "playwright";

export const injectCookies = async (context: BrowserContext, cookies: Cookie[]): Promise<void> => {
  const jar = new CookieJar(cookies);
  await context.addCookies(jar.toPlaywright());
};
