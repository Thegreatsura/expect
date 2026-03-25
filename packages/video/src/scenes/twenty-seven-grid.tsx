import { AbsoluteFill } from "remotion";
import { VIDEO_HEIGHT_PX, VIDEO_WIDTH_PX } from "../constants";
import { BrowserCell, CELL_HEIGHT_PX, CELL_WIDTH_PX, PAGE_VARIANTS } from "./browser-cell";

const CELL_COUNT = 27;
const COLUMNS = 9;
const ROWS = 3;
const GAP_PX = 1;
const SLOT_WIDTH = (VIDEO_WIDTH_PX - (COLUMNS - 1) * GAP_PX) / COLUMNS;
const SLOT_HEIGHT = (VIDEO_HEIGHT_PX - (ROWS - 1) * GAP_PX) / ROWS;
const SCALE = Math.max(SLOT_WIDTH / CELL_WIDTH_PX, SLOT_HEIGHT / CELL_HEIGHT_PX);

const FRAME_OFFSETS = Array.from({ length: CELL_COUNT }, (_, index) => (index * 13) % 80);

export const TwentySevenGrid = () => (
  <AbsoluteFill style={{ backgroundColor: "black" }}>
    {FRAME_OFFSETS.map((offset, index) => {
      const column = index % COLUMNS;
      const row = Math.floor(index / COLUMNS);
      const variant = PAGE_VARIANTS[index % PAGE_VARIANTS.length];

      return (
        <div
          key={index}
          style={{
            position: "absolute",
            left: column * (SLOT_WIDTH + GAP_PX),
            top: row * (SLOT_HEIGHT + GAP_PX),
            width: SLOT_WIDTH,
            height: SLOT_HEIGHT,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: (SLOT_WIDTH - CELL_WIDTH_PX * SCALE) / 2,
              top: (SLOT_HEIGHT - CELL_HEIGHT_PX * SCALE) / 2,
              transform: `scale(${SCALE})`,
              transformOrigin: "top left",
            }}
          >
            <BrowserCell frameOffset={offset} variant={variant} />
          </div>
        </div>
      );
    })}
  </AbsoluteFill>
);
