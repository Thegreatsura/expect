export const VIDEO_WIDTH_PX = 1920;
export const VIDEO_HEIGHT_PX = 1080;
export const VIDEO_FPS = 30;

export const BACKGROUND_COLOR = "#0a0a0a";
export const TEXT_COLOR = "#d4d4d8";
export const MUTED_COLOR = "#737373";
export const RED_COLOR = "#f87171";
export const GREEN_COLOR = "#4ade80";
export const YELLOW_COLOR = "#eab308";

export const COMMAND = "npx expect";

export const TOTAL_STEP_COUNT = 8;
export const PASSED_STEP_COUNT = 7;
export const FAILED_STEP_COUNT = 1;
export const ELAPSED_TIME = "14.3s";

export const CHAR_FRAMES = 2;
export const CURSOR_BLINK_FRAMES = 16;

export const SCENE_HERO_START = 0;
export const SCENE_HERO_DURATION = 60;
export const SCENE_TYPING_START = SCENE_HERO_START + SCENE_HERO_DURATION;
export const SCENE_TYPING_DURATION = 75;
export const SCENE_TEST_PLAN_START = SCENE_TYPING_START + SCENE_TYPING_DURATION;
export const SCENE_TEST_PLAN_DURATION = 105;
export const SCENE_RESULTS_START = SCENE_TEST_PLAN_START + SCENE_TEST_PLAN_DURATION;
export const SCENE_RESULTS_DURATION = 75;
export const SCENE_CTA_START = SCENE_RESULTS_START + SCENE_RESULTS_DURATION;
export const SCENE_CTA_DURATION = 45;

export const TOTAL_DURATION =
  SCENE_HERO_DURATION +
  SCENE_TYPING_DURATION +
  SCENE_TEST_PLAN_DURATION +
  SCENE_RESULTS_DURATION +
  SCENE_CTA_DURATION;

export const TEST_STEPS = [
  {
    description: "Navigate to login page and verify it loads",
    status: "passed" as const,
  },
  {
    description: "Enter credentials and submit the form",
    status: "passed" as const,
  },
  {
    description: "Verify dashboard renders after login",
    status: "passed" as const,
  },
  {
    description: "Click 'Create New Project' button",
    status: "passed" as const,
  },
  {
    description: "Fill in project name and description fields",
    status: "passed" as const,
  },
  {
    description: "Submit form and verify project appears in list",
    status: "passed" as const,
  },
  {
    description: "Open project settings and toggle visibility",
    status: "failed" as const,
  },
  {
    description: "Verify updated visibility badge on project card",
    status: "passed" as const,
  },
];

export const BOX_TOP = "┌─────┐";
export const BOX_BOTTOM = "└─────┘";
