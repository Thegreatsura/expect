import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import {
  ERROR_LOG_ITEMS,
  ERROR_LOG_FONT_SIZE_PX,
  ERROR_LOG_ICON_SIZE_PX,
  ERROR_LOG_ICON_LEFT_PX,
  ERROR_LOG_TEXT_LEFT_PX,
  ERROR_LOG_TOP_START_PX,
  ERROR_LOG_ITEM_SPACING_PX,
  ERROR_ICON_COLOR,
  CHECK_ICON_COLOR,
  ERROR_LOG_COVERAGE_FONT_SIZE_PX,
  ERROR_LOG_COVERAGE_COLOR,
  ERROR_LOG_PASS_INTERVAL_FRAMES,
  ERROR_LOG_PASS_TRANSITION_FRAMES,
  PASS_LOG_COVERAGE_COLOR,
} from "../constants";
import { FailedIcon } from "./diff-scan";

const ICON_VERTICAL_OFFSET_PX = -30;
const PASS_START_FRAMES = 15;
const COVERAGE_DELAY_FRAMES = 15;
const COVERAGE_FADE_FRAMES = 12;

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

const interpolateColor = (fromHex: string, toHex: string, progress: number) => {
  const from = hexToRgb(fromHex);
  const to = hexToRgb(toHex);
  const r = Math.round(from.r + (to.r - from.r) * progress);
  const g = Math.round(from.g + (to.g - from.g) * progress);
  const b = Math.round(from.b + (to.b - from.b) * progress);
  return `rgb(${r}, ${g}, ${b})`;
};

const hexToRgb = (hex: string) => {
  const result = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return {
    r: parseInt(result![1], 16),
    g: parseInt(result![2], 16),
    b: parseInt(result![3], 16),
  };
};

export const ErrorLogResolved = () => {
  const frame = useCurrentFrame();

  const lastIndex = ERROR_LOG_ITEMS.length - 1;
  const allPassedFrame =
    PASS_START_FRAMES +
    lastIndex * ERROR_LOG_PASS_INTERVAL_FRAMES +
    ERROR_LOG_PASS_TRANSITION_FRAMES;
  const coverageStartFrame = allPassedFrame + COVERAGE_DELAY_FRAMES;

  const coverageProgress = interpolate(
    frame,
    [coverageStartFrame, coverageStartFrame + COVERAGE_FADE_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) },
  );

  const coverageText =
    coverageProgress > 0 ? "100% \uD83D\uDE02\ntest coverage" : "49% \uD83D\uDE21\ntest coverage";
  const coverageColor = interpolateColor(
    ERROR_LOG_COVERAGE_COLOR,
    PASS_LOG_COVERAGE_COLOR,
    coverageProgress,
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {ERROR_LOG_ITEMS.map((item, index) => {
        const passFrame = PASS_START_FRAMES + index * ERROR_LOG_PASS_INTERVAL_FRAMES;
        const passProgress = interpolate(
          frame,
          [passFrame, passFrame + ERROR_LOG_PASS_TRANSITION_FRAMES],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );

        const topPosition = ERROR_LOG_TOP_START_PX + index * ERROR_LOG_ITEM_SPACING_PX;

        return (
          <div key={item.message}>
            <div
              style={{
                position: "absolute",
                left: ERROR_LOG_ICON_LEFT_PX,
                top: topPosition + ICON_VERTICAL_OFFSET_PX,
                width: ERROR_LOG_ICON_SIZE_PX,
                height: ERROR_LOG_ICON_SIZE_PX,
              }}
            >
              <FailedIcon size={ERROR_LOG_ICON_SIZE_PX} opacity={1 - passProgress} />
              <CheckIcon size={ERROR_LOG_ICON_SIZE_PX} opacity={passProgress} />
            </div>
            <div
              style={{
                position: "absolute",
                left: ERROR_LOG_TEXT_LEFT_PX,
                top: topPosition,
                fontFamily: "system-ui, sans-serif",
                fontSize: ERROR_LOG_FONT_SIZE_PX,
                lineHeight: "90px",
                color: "#FFFFFF",
                whiteSpace: "nowrap",
              }}
            >
              {item.message}
            </div>
          </div>
        );
      })}

      <div
        style={{
          position: "absolute",
          left: 960,
          top: 360,
          fontFamily: "system-ui, sans-serif",
          fontSize: ERROR_LOG_COVERAGE_FONT_SIZE_PX,
          lineHeight: "180px",
          color: coverageColor,
          whiteSpace: "pre",
        }}
      >
        {coverageText}
      </div>
    </AbsoluteFill>
  );
};
