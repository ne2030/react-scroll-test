import { useRef } from "react";

export const useRaf = (...logs) => {
  const rafRef = useRef<number>();
  const frameRef = useRef<number>(0);

  if (!rafRef.current) {
    rafRef.current = requestAnimationFrame(() => {
      console.log(
        `%c ------------------------------------------Frame Rendering (${logs}), frame: ${frameRef.current})`,
        "color: gray"
      );
      frameRef.current += 1;
      rafRef.current = null;
    });
  }
};
