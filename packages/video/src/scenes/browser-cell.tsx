import type { CSSProperties, ReactNode } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { fontFamily } from "../utils/font";

export const CELL_WIDTH_PX = 640;
export const CELL_HEIGHT_PX = 360;

const TRAFFIC_COLORS = ["#FF5F57", "#FEBC2E", "#28C840"];

const CURSOR_KEYFRAMES = [0, 12, 35, 42, 65, 72, 85, 95];
const CURSOR_X_VALUES = [460, 280, 280, 280, 280, 280, 280, 280];
const CURSOR_Y_VALUES = [60, 130, 130, 185, 185, 248, 248, 248];

const FIELD_1_START_FRAME = 12;
const FIELD_1_END_FRAME = 38;
const FIELD_2_START_FRAME = 42;
const FIELD_2_END_FRAME = 68;
const BUTTON_PRESS_FRAME = 78;
const SUCCESS_FRAME = 85;

const FIELD_1_TEXT = "user@example.com";
const FIELD_2_TEXT = "••••••••••";
const CHARS_PER_FRAME = 0.7;

export type PageVariant =
  | "signup"
  | "login"
  | "dashboard"
  | "settings"
  | "profile"
  | "checkout"
  | "inbox"
  | "kanban"
  | "analytics";

export const PAGE_VARIANTS: PageVariant[] = [
  "signup",
  "login",
  "dashboard",
  "settings",
  "profile",
  "checkout",
  "inbox",
  "kanban",
  "analytics",
];

const bar = (style?: CSSProperties): ReactNode => (
  <div style={{ height: 12, backgroundColor: "#e5e5e5", borderRadius: 6, ...style }} />
);

const renderVariantContent = (variant: PageVariant, frame: number) => {
  switch (variant) {
    case "signup":
    case "login":
      return renderFormContent(variant, frame);

    case "dashboard":
      return (
        <div style={{ display: "flex", gap: 16, padding: "16px 24px", height: 300 }}>
          <div style={{ width: 100, backgroundColor: "#f5f5f5", borderRadius: 10, padding: 14 }}>
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} style={{ marginBottom: 14 }}>
                {bar({ width: "80%" })}
              </div>
            ))}
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", gap: 12 }}>
              {["#eef2ff", "#f0fdf4", "#fef9ee"].map((background) => (
                <div
                  key={background}
                  style={{
                    flex: 1,
                    height: 70,
                    backgroundColor: background,
                    borderRadius: 10,
                    padding: 14,
                  }}
                >
                  {bar({ width: "50%", marginBottom: 8 })}
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: "#333",
                      fontFamily: "system-ui",
                    }}
                  >
                    1,234
                  </div>
                </div>
              ))}
            </div>
            <div style={{ flex: 1, backgroundColor: "#fafafa", borderRadius: 10, padding: 14 }}>
              {bar({ width: "30%", marginBottom: 12 })}
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100 }}>
                {[40, 65, 50, 80, 60, 90, 70, 55, 85, 45, 75, 60].map((height, index) => (
                  <div
                    key={index}
                    style={{ flex: 1, height, backgroundColor: "#ddd", borderRadius: 4 }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      );

    case "settings":
      return (
        <div style={{ padding: "24px 60px" }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: "#111",
              fontFamily: "system-ui",
              marginBottom: 20,
            }}
          >
            Settings
          </div>
          {["Notifications", "Dark mode", "Auto-save", "Analytics", "Two-factor auth"].map(
            (label, index) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: index < 4 ? "1px solid #f0f0f0" : "none",
                }}
              >
                <span style={{ fontSize: 14, color: "#555", fontFamily: "system-ui" }}>
                  {label}
                </span>
                <div
                  style={{
                    width: 36,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: index % 2 === 0 ? "#111" : "#ddd",
                    padding: 2,
                    display: "flex",
                    justifyContent: index % 2 === 0 ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: "#fff" }}
                  />
                </div>
              </div>
            ),
          )}
        </div>
      );

    case "profile":
      return (
        <div
          style={{
            padding: "30px 60px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "#e8e8e8",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              color: "#aaa",
            }}
          >
            JD
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: "#111",
              fontFamily: "system-ui",
              marginBottom: 6,
            }}
          >
            Jane Doe
          </div>
          <div style={{ fontSize: 13, color: "#999", fontFamily: "system-ui", marginBottom: 20 }}>
            jane@example.com
          </div>
          <div style={{ width: "100%" }}>
            {bar({ marginBottom: 10 })}
            {bar({ width: "75%", marginBottom: 10 })}
            {bar({ width: "85%" })}
          </div>
        </div>
      );

    case "checkout":
      return (
        <div style={{ padding: "20px 60px" }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: "#111",
              fontFamily: "system-ui",
              marginBottom: 16,
            }}
          >
            Checkout
          </div>
          {[
            { name: "Pro Plan", price: "$29/mo" },
            { name: "Extra seats ×3", price: "$27/mo" },
          ].map((item) => (
            <div
              key={item.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid #f0f0f0",
                fontSize: 14,
                fontFamily: "system-ui",
              }}
            >
              <span style={{ color: "#555" }}>{item.name}</span>
              <span style={{ color: "#333", fontWeight: 500 }}>{item.price}</span>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 0",
              fontSize: 16,
              fontWeight: 600,
              fontFamily: "system-ui",
              color: "#111",
            }}
          >
            <span>Total</span>
            <span>$56/mo</span>
          </div>
          <div
            style={{
              backgroundColor: "#111",
              color: "#fff",
              borderRadius: 8,
              padding: "12px",
              fontSize: 15,
              fontWeight: 600,
              fontFamily: "system-ui",
              textAlign: "center",
              marginTop: 8,
            }}
          >
            Pay now
          </div>
        </div>
      );

    case "inbox":
      return (
        <div style={{ padding: "8px 0" }}>
          {["Alice Cooper", "DevOps Bot", "Jane Smith", "GitHub", "Team Standup"].map(
            (sender, index) => (
              <div
                key={sender}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 24px",
                  backgroundColor: index < 2 ? "#fafafa" : "transparent",
                  borderBottom: "1px solid #f5f5f5",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "#e8e8e8",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: index < 2 ? 600 : 400,
                      color: "#333",
                      fontFamily: "system-ui",
                    }}
                  >
                    {sender}
                  </div>
                  {bar({ width: "70%", marginTop: 5, height: 8 })}
                </div>
              </div>
            ),
          )}
        </div>
      );

    case "kanban":
      return (
        <div style={{ display: "flex", gap: 12, padding: "12px 20px", height: 280 }}>
          {["To do", "In progress", "Done"].map((column) => (
            <div
              key={column}
              style={{
                flex: 1,
                backgroundColor: "#fafafa",
                borderRadius: 10,
                padding: 10,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#888",
                  fontFamily: "system-ui",
                  marginBottom: 10,
                }}
              >
                {column}
              </div>
              {Array.from({ length: column === "In progress" ? 2 : 3 }, (_, index) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: 8,
                    padding: 10,
                    marginBottom: 8,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  }}
                >
                  {bar({ width: "80%", marginBottom: 6 })}
                  {bar({ width: "50%", height: 8 })}
                </div>
              ))}
            </div>
          ))}
        </div>
      );

    case "analytics":
      return (
        <div style={{ padding: "16px 24px" }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            {["Visitors", "Conversions", "Revenue"].map((metric) => (
              <div
                key={metric}
                style={{ flex: 1, backgroundColor: "#fafafa", borderRadius: 8, padding: 12 }}
              >
                <div
                  style={{ fontSize: 11, color: "#999", fontFamily: "system-ui", marginBottom: 4 }}
                >
                  {metric}
                </div>
                <div
                  style={{ fontSize: 20, fontWeight: 700, color: "#222", fontFamily: "system-ui" }}
                >
                  {metric === "Revenue" ? "$12.4k" : metric === "Visitors" ? "8,291" : "342"}
                </div>
              </div>
            ))}
          </div>
          <div style={{ backgroundColor: "#fafafa", borderRadius: 10, padding: 14, height: 160 }}>
            <svg viewBox="0 0 400 120" style={{ width: "100%", height: "100%" }}>
              <polyline
                points="0,100 40,85 80,90 120,60 160,65 200,40 240,45 280,20 320,30 360,10 400,15"
                fill="none"
                stroke="#bbb"
                strokeWidth="2"
              />
              <polyline
                points="0,110 40,105 80,100 120,95 160,85 200,80 240,70 280,65 320,55 360,50 400,45"
                fill="none"
                stroke="#ddd"
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>
      );
  }
};

const renderFormContent = (variant: "signup" | "login", frame: number) => {
  const field1Active = frame >= FIELD_1_START_FRAME && frame < FIELD_1_END_FRAME;
  const field1TypedChars = Math.min(
    FIELD_1_TEXT.length,
    Math.max(0, Math.floor((frame - FIELD_1_START_FRAME) * CHARS_PER_FRAME)),
  );
  const field1HasText = field1TypedChars > 0 || frame >= FIELD_1_END_FRAME;

  const field2Active = frame >= FIELD_2_START_FRAME && frame < FIELD_2_END_FRAME;
  const field2TypedChars = Math.min(
    FIELD_2_TEXT.length,
    Math.max(0, Math.floor((frame - FIELD_2_START_FRAME) * CHARS_PER_FRAME)),
  );
  const field2HasText = field2TypedChars > 0 || frame >= FIELD_2_END_FRAME;

  const buttonPressed = frame >= BUTTON_PRESS_FRAME && frame < SUCCESS_FRAME;
  const success = frame >= SUCCESS_FRAME;

  const field1Display = field1HasText
    ? field1TypedChars > 0
      ? FIELD_1_TEXT.slice(0, field1TypedChars)
      : FIELD_1_TEXT
    : undefined;

  const field2Display = field2HasText
    ? field2TypedChars > 0
      ? FIELD_2_TEXT.slice(0, field2TypedChars)
      : FIELD_2_TEXT
    : undefined;

  const isLogin = variant === "login";

  return (
    <div style={{ padding: "32px 100px" }}>
      <div
        style={{
          fontSize: 26,
          fontWeight: 600,
          color: "#111",
          marginBottom: 20,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {isLogin ? "Welcome back" : "Sign up"}
      </div>

      <div
        style={{
          border: `2px solid ${field1Active ? "#3b82f6" : "#e0e0e0"}`,
          borderRadius: 8,
          padding: "10px 14px",
          marginBottom: 12,
          fontSize: 15,
          fontFamily,
          color: "#333",
          backgroundColor: field1Active ? "#eff6ff" : "#fafafa",
          minHeight: 20,
        }}
      >
        {field1Display ?? <span style={{ color: "#bbb" }}>{isLogin ? "Username" : "Email"}</span>}
      </div>

      <div
        style={{
          border: `2px solid ${field2Active ? "#3b82f6" : "#e0e0e0"}`,
          borderRadius: 8,
          padding: "10px 14px",
          marginBottom: 20,
          fontSize: 15,
          fontFamily,
          color: "#333",
          backgroundColor: field2Active ? "#eff6ff" : "#fafafa",
          minHeight: 20,
        }}
      >
        {field2Display ?? <span style={{ color: "#bbb" }}>Password</span>}
      </div>

      <div
        style={{
          backgroundColor: success ? "#22c55e" : "#111",
          color: "#fff",
          borderRadius: 8,
          padding: "12px 24px",
          fontSize: 15,
          fontWeight: 600,
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          transform: buttonPressed ? "scale(0.96)" : "scale(1)",
        }}
      >
        {success ? "✓" : isLogin ? "Log in" : "Submit"}
      </div>
    </div>
  );
};

interface BrowserCellProps {
  frameOffset?: number;
  variant?: PageVariant;
}

export const BrowserCell = ({ frameOffset = 0, variant = "signup" }: BrowserCellProps) => {
  const rawFrame = useCurrentFrame();
  const frame = rawFrame + frameOffset;

  const cursorX = interpolate(frame, CURSOR_KEYFRAMES, CURSOR_X_VALUES, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cursorY = interpolate(frame, CURSOR_KEYFRAMES, CURSOR_Y_VALUES, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const buttonPressed = frame >= BUTTON_PRESS_FRAME && frame < SUCCESS_FRAME;

  return (
    <div
      style={{
        width: CELL_WIDTH_PX,
        height: CELL_HEIGHT_PX,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: "#ffffff",
        position: "relative",
        boxShadow: "0 4px 24px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "11px 16px",
          backgroundColor: "#f8f8f8",
          borderBottom: "1px solid #e8e8e8",
        }}
      >
        {TRAFFIC_COLORS.map((color) => (
          <div
            key={color}
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: color,
            }}
          />
        ))}
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div
            style={{
              backgroundColor: "#eee",
              borderRadius: 6,
              padding: "4px 32px",
              fontSize: 13,
              fontFamily,
              color: "#999",
            }}
          >
            localhost:3000
          </div>
        </div>
      </div>

      {renderVariantContent(variant, frame)}

      <svg
        width="22"
        height="28"
        viewBox="0 0 22 28"
        style={{
          position: "absolute",
          left: cursorX,
          top: cursorY,
          pointerEvents: "none",
          filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.25))",
          transform: buttonPressed ? "scale(0.8)" : "scale(1)",
        }}
      >
        <path
          d="M2 1L2 22L8 16L14.5 16L2 1Z"
          fill="white"
          stroke="black"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
