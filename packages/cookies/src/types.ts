export type SameSitePolicy = "Strict" | "Lax" | "None";

export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  secure: boolean;
  httpOnly: boolean;
  sameSite?: SameSitePolicy;
  browser: Browser;
}

export type Browser =
  | "chrome"
  | "edge"
  | "brave"
  | "arc"
  | "dia"
  | "helium"
  | "chromium"
  | "vivaldi"
  | "opera"
  | "ghost"
  | "sidekick"
  | "yandex"
  | "iridium"
  | "thorium"
  | "sigmaos"
  | "wavebox"
  | "comet"
  | "blisk"
  | "firefox"
  | "safari";

export type ChromiumBrowser = Exclude<Browser, "firefox" | "safari">;

export interface ExtractOptions {
  url: string;
  browsers?: Browser[];
  names?: string[];
  includeExpired?: boolean;
  timeoutMs?: number;
  onKeychainAccess?: (browser: Browser) => void | Promise<void>;
}

export interface ExtractResult {
  cookies: Cookie[];
  warnings: string[];
}

export interface BrowserInfo {
  name: string;
  executablePath: string;
}

export interface BrowserProfile {
  profileName: string;
  profilePath: string;
  displayName: string;
  browser: BrowserInfo;
}

export interface LocalStateProfile {
  name: string;
}

export interface ExtractProfileOptions {
  profile: BrowserProfile;
  port?: number;
}

export interface CdpRawCookie {
  domain: string;
  name: string;
  value: string;
  path: string;
  expires: number;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string;
  priority: string;
  sourceScheme: string;
  sourcePort: number;
  sameParty: boolean;
  partitionKey?: string;
  url?: string;
}

export interface CdpResponse {
  id: number;
  error?: {
    code: number;
    message: string;
  };
  result?: {
    cookies: CdpRawCookie[];
  };
}
