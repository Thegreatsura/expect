import { AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame } from "remotion";
import { CHECK_ICON_COLOR, COMMAND, VIDEO_HEIGHT_PX, VIDEO_WIDTH_PX } from "../constants";
import { fontFamily } from "../utils/font";
import { BrowserCell, CELL_HEIGHT_PX, CELL_WIDTH_PX, type PageVariant } from "./browser-cell";
import { SpinnerIcon } from "./diff-scan";

const FRAMES_PER_CASE = 75;
const FINALE_FRAMES = 90;
const CASE_COUNT = 5;
export const SPLIT_SCREEN_DURATION_FRAMES = FRAMES_PER_CASE * CASE_COUNT + FINALE_FRAMES;

interface TestCase {
  category: string;
  label: string;
  variant: PageVariant;
}

const TEST_CASES: TestCase[] = [
  { category: "E2E", label: "checkout flow → 500 Internal Server Error", variant: "signup" },
  { category: "Perf", label: "First Contentful Paint exceeds 2.5s", variant: "analytics" },
  { category: "Debug", label: "TypeError — undefined is not a function", variant: "dashboard" },
  { category: "A11y", label: "contrast ratio 2.1:1 (min 4.5:1)", variant: "settings" },
  { category: "Security", label: "CSRF token missing on POST /api/pay", variant: "checkout" },
];

const LEFT_RATIO = 0.38;
const LEFT_WIDTH_PX = Math.round(VIDEO_WIDTH_PX * LEFT_RATIO);

const ENTRY_ICON_SIZE_PX = 40;
const ENTRY_ICON_X_PX = 50;
const ENTRY_TEXT_X_PX = 105;
const ENTRY_SPACING_PX = 80;
const ENTRY_FONT_SIZE_PX = 22;
const ENTRY_APPEAR_FRAMES = 8;
const ENTRY_GROUP_HEIGHT = (CASE_COUNT - 1) * ENTRY_SPACING_PX;
const ENTRY_TOP_START_PX = (VIDEO_HEIGHT_PX - ENTRY_GROUP_HEIGHT) / 2;

const RIGHT_X_PX = LEFT_WIDTH_PX + 1;
const RIGHT_WIDTH_PX = VIDEO_WIDTH_PX - RIGHT_X_PX;
const BROWSER_PADDING_X_PX = 50;
const BROWSER_PADDING_Y_PX = 60;
const BROWSER_SCALE_X = (RIGHT_WIDTH_PX - BROWSER_PADDING_X_PX * 2) / CELL_WIDTH_PX;
const BROWSER_SCALE_Y = (VIDEO_HEIGHT_PX - BROWSER_PADDING_Y_PX * 2) / CELL_HEIGHT_PX;
const BROWSER_SCALE = Math.min(BROWSER_SCALE_X, BROWSER_SCALE_Y);
const BROWSER_LEFT = RIGHT_X_PX + (RIGHT_WIDTH_PX - CELL_WIDTH_PX * BROWSER_SCALE) / 2;
const BROWSER_TOP = (VIDEO_HEIGHT_PX - CELL_HEIGHT_PX * BROWSER_SCALE) / 2;

const FINALE_START_FRAME = FRAMES_PER_CASE * CASE_COUNT;
const CHECK_TRANSITION_FRAMES = 8;

const SHIMMER_CYCLE_FRAMES = 30;

const CheckIcon = ({ size, opacity }: { size: number; opacity: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    style={{ opacity, position: "absolute", inset: 0 }}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M1.25 12C1.25 17.937 6.063 22.75 12 22.75C17.937 22.75 22.75 17.937 22.75 12C22.75 6.063 17.937 1.25 12 1.25C6.063 1.25 1.25 6.063 1.25 12ZM16.676 8.263C17.083 8.636 17.11 9.269 16.737 9.676L11.237 15.676C11.053 15.877 10.794 15.994 10.522 16C10.249 16.006 9.986 15.9 9.793 15.707L7.293 13.207C6.902 12.817 6.902 12.183 7.293 11.793C7.683 11.402 8.317 11.402 8.707 11.793L10.469 13.554L15.263 8.324C15.636 7.917 16.269 7.89 16.676 8.263Z"
      fill={CHECK_ICON_COLOR}
    />
  </svg>
);

const ShimmerText = ({ text, frame }: { text: string; frame: number }) => {
  const progress = (frame % SHIMMER_CYCLE_FRAMES) / SHIMMER_CYCLE_FRAMES;
  const shimmerPosition = progress * 200 - 50;

  return (
    <span
      style={{
        backgroundImage: `linear-gradient(90deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.7) ${shimmerPosition}%, rgba(255,255,255,0.35) ${shimmerPosition + 30}%)`,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}
    >
      {text}
    </span>
  );
};

export const SplitScreen = () => {
  const frame = useCurrentFrame();
  const isFinale = frame >= FINALE_START_FRAME;
  const activeCaseIndex = isFinale
    ? CASE_COUNT - 1
    : Math.min(CASE_COUNT - 1, Math.floor(frame / FRAMES_PER_CASE));

  const passProgress = isFinale
    ? interpolate(
        frame,
        [FINALE_START_FRAME, FINALE_START_FRAME + CHECK_TRANSITION_FRAMES],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) },
      )
    : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <div
        style={{
          position: "absolute",
          left: ENTRY_ICON_X_PX,
          top: ENTRY_TOP_START_PX - 50,
          fontSize: 20,
          fontFamily,
          color: "#555",
        }}
      >
        <span style={{ color: "#555" }}>$ </span>
        <span style={{ color: "#999" }}>{COMMAND}</span>
      </div>

      {TEST_CASES.map((testCase, index) => {
        const caseStart = index * FRAMES_PER_CASE;
        if (frame < caseStart) return undefined;

        const appearOpacity = interpolate(
          frame,
          [caseStart, caseStart + ENTRY_APPEAR_FRAMES],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) },
        );

        const isActive = index === activeCaseIndex && !isFinale;
        const topPosition = ENTRY_TOP_START_PX + index * ENTRY_SPACING_PX;

        return (
          <div key={testCase.label} style={{ opacity: appearOpacity }}>
            <div
              style={{
                position: "absolute",
                left: ENTRY_ICON_X_PX,
                top: topPosition - 8,
                width: ENTRY_ICON_SIZE_PX,
                height: ENTRY_ICON_SIZE_PX,
              }}
            >
              {passProgress > 0 && <CheckIcon size={ENTRY_ICON_SIZE_PX} opacity={passProgress} />}
              {passProgress < 1 && <SpinnerIcon size={ENTRY_ICON_SIZE_PX} frame={frame} />}
            </div>

            <div
              style={{
                position: "absolute",
                left: ENTRY_TEXT_X_PX,
                top: topPosition,
                fontSize: ENTRY_FONT_SIZE_PX,
                fontFamily,
                whiteSpace: "nowrap",
                display: "flex",
                gap: 10,
                alignItems: "baseline",
              }}
            >
              <span style={{ color: "#555", fontWeight: 600, minWidth: 72 }}>
                {testCase.category}
              </span>
              {isActive ? (
                <ShimmerText text={testCase.label} frame={frame} />
              ) : (
                <span style={{ color: passProgress > 0 ? CHECK_ICON_COLOR : "#aaa" }}>
                  {testCase.label}
                </span>
              )}
            </div>
          </div>
        );
      })}

      <div
        style={{
          position: "absolute",
          left: LEFT_WIDTH_PX,
          top: 0,
          width: 1,
          height: "100%",
          backgroundColor: "rgba(255,255,255,0.08)",
        }}
      />

      {TEST_CASES.map((testCase, index) => (
        <Sequence
          key={testCase.label}
          from={index * FRAMES_PER_CASE}
          durationInFrames={
            index === CASE_COUNT - 1 ? FRAMES_PER_CASE + FINALE_FRAMES : FRAMES_PER_CASE
          }
        >
          <div
            style={{
              position: "absolute",
              left: BROWSER_LEFT,
              top: BROWSER_TOP,
              transform: `scale(${BROWSER_SCALE})`,
              transformOrigin: "top left",
            }}
          >
            <BrowserCell variant={testCase.variant} />
          </div>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
