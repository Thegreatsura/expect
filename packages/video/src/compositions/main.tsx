import { springTiming, TransitionSeries } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { Audio, Sequence, staticFile } from "remotion";
import {
  CHAR_FRAMES,
  COMMAND,
  SCENE_BROWSER_EXECUTION_DURATION_FRAMES,
  SCENE_DIFF_SCAN_DURATION_FRAMES,
  SCENE_ERROR_LOG_RESOLVED_DURATION_FRAMES,
  SCENE_RESULTS_DURATION_FRAMES,
  SCENE_TEST_PLAN_DURATION_FRAMES,
  SCENE_TYPING_DURATION_FRAMES,
  TRANSITION_DURATION_FRAMES,
  TYPING_INITIAL_DELAY_FRAMES,
  VIDEO_FPS,
} from "../constants";
import { BrowserExecution } from "../scenes/browser-execution";
import { DiffScan } from "../scenes/diff-scan";
import { ErrorLogResolved } from "../scenes/error-log-resolved";
import { Results } from "../scenes/results";
import { TestPlan } from "../scenes/test-plan";
import { TerminalTyping } from "../scenes/terminal-typing";

const MUSIC_START_SECONDS = 27;
const MUSIC_START_FRAME = MUSIC_START_SECONDS * VIDEO_FPS;
const TYPING_SOUND_START_SECONDS = 3;
const TYPING_SOUND_START_FRAME = TYPING_SOUND_START_SECONDS * VIDEO_FPS;
const TYPING_DURATION_FRAMES = COMMAND.length * CHAR_FRAMES;

export const Main = () => {
  return (
    <>
      <Audio src={staticFile("music.wav")} startFrom={MUSIC_START_FRAME} />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENE_TYPING_DURATION_FRAMES}>
          <TerminalTyping />
          <Sequence from={TYPING_INITIAL_DELAY_FRAMES} durationInFrames={TYPING_DURATION_FRAMES}>
            <Audio src={staticFile("typing.mp3")} startFrom={TYPING_SOUND_START_FRAME} />
          </Sequence>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={springTiming({
            config: { damping: 200 },
            durationInFrames: TRANSITION_DURATION_FRAMES,
          })}
        />

        <TransitionSeries.Sequence durationInFrames={SCENE_DIFF_SCAN_DURATION_FRAMES}>
          <DiffScan />
        </TransitionSeries.Sequence>

        <TransitionSeries.Sequence durationInFrames={SCENE_TEST_PLAN_DURATION_FRAMES}>
          <TestPlan />
        </TransitionSeries.Sequence>

        <TransitionSeries.Sequence durationInFrames={SCENE_BROWSER_EXECUTION_DURATION_FRAMES}>
          <BrowserExecution />
        </TransitionSeries.Sequence>

        <TransitionSeries.Sequence durationInFrames={SCENE_RESULTS_DURATION_FRAMES}>
          <Results />
        </TransitionSeries.Sequence>

        <TransitionSeries.Sequence durationInFrames={SCENE_ERROR_LOG_RESOLVED_DURATION_FRAMES}>
          <ErrorLogResolved />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </>
  );
};
