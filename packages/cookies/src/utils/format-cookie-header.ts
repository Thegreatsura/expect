import type { Cookie } from "../types.js";

export const toCookieHeader = (cookies: Cookie[]): string =>
  cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
