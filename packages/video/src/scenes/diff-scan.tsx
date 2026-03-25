import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import {
  ERROR_LOG_ITEMS,
  ERROR_LOG_FONT_SIZE_PX,
  ERROR_LOG_ICON_SIZE_PX,
  ERROR_LOG_ICON_LEFT_PX,
  ERROR_LOG_TEXT_LEFT_PX,
  ERROR_LOG_TOP_START_PX,
  ERROR_LOG_ITEM_SPACING_PX,
  ERROR_LOG_INITIAL_DELAY_FRAMES,
  ERROR_LOG_APPEAR_FRAMES,
  ERROR_LOG_APPEAR_STAGGER_FRAMES,
  ERROR_LOG_FAIL_START_FRAMES,
  ERROR_LOG_FAIL_INTERVAL_FRAMES,
  ERROR_LOG_FAIL_TRANSITION_FRAMES,
  ERROR_ICON_COLOR,
} from "../constants";

const SPINNER_SPOKE_COUNT = 12;
const SPINNER_FRAME_RATE = 3;
const ICON_VERTICAL_OFFSET_PX = -30;
const SHIMMER_CYCLE_FRAMES = 30;

const SPINNER_PATHS = [
  "M12 2v4",
  "M15 6.8l2-3.5",
  "M17.2 9l3.5-2",
  "M18 12h4",
  "M17.2 15l3.5 2",
  "M15 17.2l2 3.5",
  "M12 18v4",
  "M9 17.2l-2 3.5",
  "M6.8 15l-3.5 2",
  "M2 12h4",
  "M6.8 9l-3.5-2",
  "M9 6.8l-2-3.5",
];

export const FailedIcon = ({ size, opacity }: { size: number; opacity: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    style={{ opacity, position: "absolute", inset: 0 }}
  >
    <path
      d="M12 1.25C17.937 1.25 22.75 6.063 22.75 12C22.75 17.937 17.937 22.75 12 22.75C6.063 22.75 1.25 17.937 1.25 12C1.25 6.063 6.063 1.25 12 1.25ZM9.631 8.225C9.238 7.904 8.659 7.927 8.293 8.293C7.927 8.659 7.904 9.238 8.225 9.631L8.293 9.707L10.586 12L8.294 14.293C7.904 14.684 7.903 15.317 8.294 15.707C8.684 16.097 9.318 16.097 9.708 15.707L12 13.414L14.292 15.707L14.368 15.775C14.761 16.096 15.34 16.073 15.706 15.707C16.072 15.341 16.095 14.762 15.775 14.369L15.706 14.293L13.413 12L15.707 9.707L15.775 9.631C16.096 9.238 16.073 8.659 15.707 8.293C15.341 7.927 14.762 7.904 14.369 8.225L14.293 8.293L12 10.586L9.707 8.293L9.631 8.225Z"
      fill={ERROR_ICON_COLOR}
    />
  </svg>
);

export const SpinnerIcon = ({ size, frame }: { size: number; frame: number }) => {
  const activeIndex = Math.floor(frame / SPINNER_FRAME_RATE) % SPINNER_SPOKE_COUNT;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="#FFFFFF"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {SPINNER_PATHS.map((d, index) => {
        const distance = (index - activeIndex + SPINNER_SPOKE_COUNT) % SPINNER_SPOKE_COUNT;
        const opacity = Math.max(0.15, 1 - distance * 0.07);
        return <path key={d} d={d} opacity={opacity} />;
      })}
    </svg>
  );
};

export const ShimmerText = ({ text, frame }: { text: string; frame: number }) => {
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

export const DiffScan = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {ERROR_LOG_ITEMS.map((item, index) => {
        const appearStart =
          ERROR_LOG_INITIAL_DELAY_FRAMES + index * ERROR_LOG_APPEAR_STAGGER_FRAMES;
        const appearOpacity = interpolate(
          frame,
          [appearStart, appearStart + ERROR_LOG_APPEAR_FRAMES],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) },
        );

        const failFrame =
          ERROR_LOG_FAIL_START_FRAMES + item.failIndex * ERROR_LOG_FAIL_INTERVAL_FRAMES;
        const failProgress = interpolate(
          frame,
          [failFrame, failFrame + ERROR_LOG_FAIL_TRANSITION_FRAMES],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
        const isLoading = failProgress === 0;

        const topPosition = ERROR_LOG_TOP_START_PX + index * ERROR_LOG_ITEM_SPACING_PX;

        return (
          <div key={item.message} style={{ opacity: appearOpacity }}>
            <div
              style={{
                position: "absolute",
                left: ERROR_LOG_ICON_LEFT_PX,
                top: topPosition + ICON_VERTICAL_OFFSET_PX,
                width: ERROR_LOG_ICON_SIZE_PX,
                height: ERROR_LOG_ICON_SIZE_PX,
              }}
            >
              {isLoading ? (
                <SpinnerIcon size={ERROR_LOG_ICON_SIZE_PX} frame={frame} />
              ) : (
                <FailedIcon size={ERROR_LOG_ICON_SIZE_PX} opacity={failProgress} />
              )}
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
              {isLoading ? <ShimmerText text={item.message} frame={frame} /> : item.message}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
