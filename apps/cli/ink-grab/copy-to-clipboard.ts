import { execSync } from "node:child_process";
import { platform } from "node:os";

export const copyToClipboard = (text: string): boolean => {
  try {
    const currentPlatform = platform();
    if (currentPlatform === "darwin") {
      execSync("pbcopy", { input: text, stdio: ["pipe", "ignore", "ignore"] });
    } else if (currentPlatform === "win32") {
      execSync("clip", { input: text, stdio: ["pipe", "ignore", "ignore"] });
    } else {
      execSync("xclip -selection clipboard", { input: text, stdio: ["pipe", "ignore", "ignore"] });
    }
    return true;
  } catch {
    return false;
  }
};
