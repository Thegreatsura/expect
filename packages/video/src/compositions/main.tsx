import { loadFont } from "@remotion/google-fonts/IBMPlexMono";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  BACKGROUND_COLOR,
  BOX_BOTTOM,
  BOX_TOP,
  CHAR_FRAMES,
  COMMAND,
  CURSOR_BLINK_FRAMES,
  ELAPSED_TIME,
  FAILED_STEP_COUNT,
  GREEN_COLOR,
  MUTED_COLOR,
  PASSED_STEP_COUNT,
  RED_COLOR,
  SCENE_CTA_DURATION,
  SCENE_CTA_START,
  SCENE_HERO_DURATION,
  SCENE_HERO_START,
  SCENE_RESULTS_DURATION,
  SCENE_RESULTS_START,
  SCENE_TEST_PLAN_DURATION,
  SCENE_TEST_PLAN_START,
  SCENE_TYPING_DURATION,
  SCENE_TYPING_START,
  TEST_STEPS,
  TEXT_COLOR,
  TOTAL_STEP_COUNT,
} from "../constants";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "500"],
  subsets: ["latin"],
});

const baseStyle: React.CSSProperties = {
  fontFamily,
  color: TEXT_COLOR,
  fontSize: 32,
  lineHeight: 1.6,
};

const HeroScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 200 } });
  const subtitleSpring = spring({
    frame,
    fps,
    config: { damping: 200 },
    delay: 10,
  });

  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleY = interpolate(titleSpring, [0, 1], [30, 0]);
  const subtitleOpacity = interpolate(subtitleSpring, [0, 1], [0, 1]);
  const subtitleY = interpolate(subtitleSpring, [0, 1], [20, 0]);

  return (
    <AbsoluteFill
      style={{
        ...baseStyle,
        backgroundColor: BACKGROUND_COLOR,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
        }}
      >
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            fontSize: 72,
            fontWeight: 500,
            color: "white",
          }}
        >
          expect
        </div>
        <div
          style={{
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleY}px)`,
            color: MUTED_COLOR,
            fontSize: 28,
          }}
        >
          Browser testing for coding agents.
        </div>
      </div>
    </AbsoluteFill>
  );
};

const TypingScene = () => {
  const frame = useCurrentFrame();

  const typedCharCount = Math.min(COMMAND.length, Math.floor(frame / CHAR_FRAMES));
  const typedCommand = COMMAND.slice(0, typedCharCount);
  const isTypingDone = typedCharCount >= COMMAND.length;

  const cursorOpacity = interpolate(
    frame % CURSOR_BLINK_FRAMES,
    [0, CURSOR_BLINK_FRAMES / 2, CURSOR_BLINK_FRAMES],
    [1, 0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        ...baseStyle,
        backgroundColor: BACKGROUND_COLOR,
        justifyContent: "center",
        padding: 120,
      }}
    >
      <div>
        <span style={{ color: MUTED_COLOR }}>$ </span>
        <span style={{ color: "white" }}>{typedCommand}</span>
        <span style={{ opacity: cursorOpacity }}>▋</span>
      </div>

      {isTypingDone && (
        <div style={{ marginTop: 32 }}>
          <div style={{ color: "white" }}>expect</div>
          <div style={{ color: MUTED_COLOR }}>Scanning git changes... generating test plan</div>
        </div>
      )}
    </AbsoluteFill>
  );
};

const TestPlanScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const framesPerStep = Math.floor((SCENE_TEST_PLAN_DURATION - 15) / TEST_STEPS.length);

  return (
    <AbsoluteFill
      style={{
        ...baseStyle,
        backgroundColor: BACKGROUND_COLOR,
        justifyContent: "center",
        padding: 120,
      }}
    >
      <div style={{ color: MUTED_COLOR, marginBottom: 8 }}>$ {COMMAND}</div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ color: "white" }}>expect</div>
        <div style={{ color: MUTED_COLOR, marginBottom: 16 }}>
          Running test plan against live browser...
        </div>
      </div>

      {TEST_STEPS.map((step, index) => {
        const stepFrame = index * framesPerStep;
        const stepSpring = spring({
          frame: frame - stepFrame,
          fps,
          config: { damping: 200 },
        });

        const stepOpacity = interpolate(stepSpring, [0, 1], [0, 1]);
        const stepY = interpolate(stepSpring, [0, 1], [10, 0]);

        const statusColor = step.status === "passed" ? GREEN_COLOR : RED_COLOR;
        const statusIcon = step.status === "passed" ? "✓" : "✗";

        return (
          <div
            key={step.description}
            style={{
              opacity: stepOpacity,
              transform: `translateY(${stepY}px)`,
              marginBottom: 4,
              fontSize: 26,
            }}
          >
            <span style={{ color: statusColor }}> {statusIcon}</span>
            {` ${step.description}`}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const ResultsScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const countProgress = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const currentPassed = Math.round(countProgress * PASSED_STEP_COUNT);

  const resultSpring = spring({ frame, fps, config: { damping: 200 } });
  const resultOpacity = interpolate(resultSpring, [0, 1], [0, 1]);
  const resultScale = interpolate(resultSpring, [0, 1], [0.95, 1]);

  const summarySpring = spring({
    frame,
    fps,
    config: { damping: 200 },
    delay: 40,
  });
  const summaryOpacity = interpolate(summarySpring, [0, 1], [0, 1]);

  const barWidth = 30;
  const filledCount = Math.round((currentPassed / TOTAL_STEP_COUNT) * barWidth);
  const failedCount = Math.round((FAILED_STEP_COUNT / TOTAL_STEP_COUNT) * barWidth);
  const emptyCount = barWidth - filledCount - failedCount;

  return (
    <AbsoluteFill
      style={{
        ...baseStyle,
        backgroundColor: BACKGROUND_COLOR,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
        }}
      >
        <div
          style={{
            opacity: resultOpacity,
            transform: `scale(${resultScale})`,
          }}
        >
          <pre
            style={{
              color: GREEN_COLOR,
              lineHeight: 1.2,
              fontSize: 40,
              textAlign: "center",
            }}
          >
            {`  ${BOX_TOP}\n  │ ◠ ◠ │\n  │  ▽  │\n  ${BOX_BOTTOM}`}
          </pre>
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48 }}>
            <span style={{ color: GREEN_COLOR, fontWeight: 500 }}>{currentPassed}</span>
            <span style={{ color: MUTED_COLOR }}>{` / ${TOTAL_STEP_COUNT} passed  `}</span>
          </div>

          <div style={{ fontSize: 28, marginTop: 8, letterSpacing: 1 }}>
            <span style={{ color: GREEN_COLOR }}>{"█".repeat(filledCount)}</span>
            <span style={{ color: RED_COLOR }}>{"█".repeat(failedCount)}</span>
            <span style={{ color: "#525252" }}>{"░".repeat(emptyCount)}</span>
          </div>
        </div>

        <div style={{ opacity: summaryOpacity, fontSize: 28, marginTop: 8 }}>
          <span style={{ color: GREEN_COLOR }}>{PASSED_STEP_COUNT} passed</span>
          <span style={{ color: RED_COLOR }}>{`  ${FAILED_STEP_COUNT} failed`}</span>
          <span style={{ color: MUTED_COLOR }}>{`  in ${ELAPSED_TIME}`}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const CtaScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const commandSpring = spring({ frame, fps, config: { damping: 200 } });
  const commandOpacity = interpolate(commandSpring, [0, 1], [0, 1]);
  const commandY = interpolate(commandSpring, [0, 1], [20, 0]);

  const labelSpring = spring({
    frame,
    fps,
    config: { damping: 200 },
    delay: 8,
  });
  const labelOpacity = interpolate(labelSpring, [0, 1], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        ...baseStyle,
        backgroundColor: BACKGROUND_COLOR,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
        }}
      >
        <div style={{ opacity: labelOpacity, color: MUTED_COLOR, fontSize: 28 }}>
          Let your coding agent test in a real browser
        </div>
        <div
          style={{
            opacity: commandOpacity,
            transform: `translateY(${commandY}px)`,
            border: "1px solid rgba(255,255,255,0.2)",
            padding: "12px 24px",
            fontSize: 36,
            color: "white",
          }}
        >
          {COMMAND}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Main = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: BACKGROUND_COLOR }}>
      <Sequence from={SCENE_HERO_START} durationInFrames={SCENE_HERO_DURATION} premountFor={10}>
        <HeroScene />
      </Sequence>
      <Sequence from={SCENE_TYPING_START} durationInFrames={SCENE_TYPING_DURATION} premountFor={10}>
        <TypingScene />
      </Sequence>
      <Sequence
        from={SCENE_TEST_PLAN_START}
        durationInFrames={SCENE_TEST_PLAN_DURATION}
        premountFor={10}
      >
        <TestPlanScene />
      </Sequence>
      <Sequence
        from={SCENE_RESULTS_START}
        durationInFrames={SCENE_RESULTS_DURATION}
        premountFor={10}
      >
        <ResultsScene />
      </Sequence>
      <Sequence from={SCENE_CTA_START} durationInFrames={SCENE_CTA_DURATION} premountFor={10}>
        <CtaScene />
      </Sequence>
    </AbsoluteFill>
  );
};
