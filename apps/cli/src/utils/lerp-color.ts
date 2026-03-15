const parseHex = (hex: string): [number, number, number] => {
  const cleaned = hex.replace("#", "");
  return [
    parseInt(cleaned.slice(0, 2), 16),
    parseInt(cleaned.slice(2, 4), 16),
    parseInt(cleaned.slice(4, 6), 16),
  ];
};

const rgbToHex = (red: number, green: number, blue: number): string =>
  `#${[red, green, blue].map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;

const lerp = (start: number, end: number, factor: number): number =>
  start + (end - start) * factor;

export const lerpColor = (from: string, to: string, factor: number): string => {
  const [fromRed, fromGreen, fromBlue] = parseHex(from);
  const [toRed, toGreen, toBlue] = parseHex(to);
  return rgbToHex(
    lerp(fromRed, toRed, factor),
    lerp(fromGreen, toGreen, factor),
    lerp(fromBlue, toBlue, factor),
  );
};
