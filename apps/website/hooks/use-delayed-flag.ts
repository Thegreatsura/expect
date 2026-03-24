"use client";

/* eslint-disable no-restricted-imports -- internal hook wrapping useEffect for delayed boolean transitions */
import { useEffect, useState } from "react";

export const useDelayedFlag = (trigger: boolean, delayMs: number): boolean => {
  const [value, setValue] = useState(false);

  useEffect(() => {
    if (!trigger || value) return;
    const timer = window.setTimeout(() => setValue(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [trigger, value, delayMs]);

  return value;
};
