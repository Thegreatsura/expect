import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { chromium } from "playwright";
import type { Browser, BrowserContext, Page } from "playwright";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { Cookie } from "@browser-tester/cookies";
import { injectCookies } from "../src/inject-cookies";

describe("cookie injection", () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  let server: Server;
  let serverPort: number;

  const testCookies = [
    Cookie.make({
      name: "test_session",
      value: "abc123",
      domain: "localhost",
      path: "/",
      secure: false,
      httpOnly: false,
    }),
    Cookie.make({
      name: "user_pref",
      value: "dark_mode",
      domain: "localhost",
      path: "/",
      secure: false,
      httpOnly: false,
    }),
  ];

  beforeAll(async () => {
    server = createServer((_request, response) => {
      response.writeHead(200, { "Content-Type": "text/html" });
      response.end("<html><body><h1>Cookie Test</h1></body></html>");
    });

    await new Promise<void>((resolve) => {
      server.listen(0, "localhost", () => {
        serverPort = (server.address() as AddressInfo).port;
        resolve();
      });
    });

    browser = await chromium.launch({ headless: true });
    context = await browser.newContext();
    await injectCookies(context, testCookies);
    page = await context.newPage();
  });

  afterAll(async () => {
    await browser.close();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it("should have injected cookies readable via document.cookie", async () => {
    await page.goto(`http://localhost:${serverPort}`);
    const documentCookies = await page.evaluate(() => document.cookie);
    expect(documentCookies).toContain("test_session=abc123");
    expect(documentCookies).toContain("user_pref=dark_mode");
  });

  it("should have cookies present in the browser context", async () => {
    const cookies = await context.cookies();
    const sessionCookie = cookies.find((cookie) => cookie.name === "test_session");
    const prefCookie = cookies.find((cookie) => cookie.name === "user_pref");
    expect(sessionCookie?.value).toBe("abc123");
    expect(prefCookie?.value).toBe("dark_mode");
  });

  it("should persist cookies across page navigations", async () => {
    await page.goto(`http://localhost:${serverPort}/other`);
    const documentCookies = await page.evaluate(() => document.cookie);
    expect(documentCookies).toContain("test_session=abc123");
    expect(documentCookies).toContain("user_pref=dark_mode");
  });
});
