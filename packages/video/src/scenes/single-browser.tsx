import { AbsoluteFill } from "remotion";
import { VIDEO_HEIGHT_PX, VIDEO_WIDTH_PX } from "../constants";
import { BrowserCell, CELL_HEIGHT_PX, CELL_WIDTH_PX } from "./browser-cell";

const SCALE = Math.max(VIDEO_WIDTH_PX / CELL_WIDTH_PX, VIDEO_HEIGHT_PX / CELL_HEIGHT_PX);
const LEFT = (VIDEO_WIDTH_PX - CELL_WIDTH_PX * SCALE) / 2;
const TOP = (VIDEO_HEIGHT_PX - CELL_HEIGHT_PX * SCALE) / 2;

export const SingleBrowser = () => (
  <AbsoluteFill style={{ backgroundColor: "black", overflow: "hidden" }}>
    <div
      style={{
        position: "absolute",
        left: LEFT,
        top: TOP,
        transform: `scale(${SCALE})`,
        transformOrigin: "top left",
      }}
    >
      <BrowserCell />
    </div>
  </AbsoluteFill>
);
