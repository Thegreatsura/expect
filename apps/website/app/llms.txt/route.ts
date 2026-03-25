import { NextResponse } from "next/server";

const LLMS_TXT = `# Expect

> Let agents test your code in a real browser.

Expect is a CLI tool that lets coding agents (Claude Code, Codex CLI, Cursor) automatically test code changes in a real browser.

## How it works

1. Run \`npx expect-cli\` in your terminal
2. Expect scans your unstaged git changes or branch diff
3. An AI agent generates a test plan describing how to validate the changes
4. You review and approve the plan in an interactive TUI
5. The agent executes the test plan against a live browser instance
6. Results are displayed with pass/fail status and session recordings

## Links

- [Home](https://www.expect.dev/)
- [Privacy Policy](https://www.expect.dev/privacy)
- [Terms of Service](https://www.expect.dev/terms)
- [Security Policy](https://www.expect.dev/security)

## Installation

\`\`\`bash
npx expect-cli
\`\`\`

## Contact

- support@million.dev
`;

export const GET = () =>
  new NextResponse(LLMS_TXT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
