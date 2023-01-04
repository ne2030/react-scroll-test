import { filter, head, map, pipe, reverse, take } from "@fxts/core";

const DEBUG = true;

export const debug = (log: any, color = "color: #10A19D") => {
  if (DEBUG) {
    const content = typeof log == "string" ? [`%c ${log}`, color] : [log];
    console.log(...content);
  }
};

export const createOrderedDebug = () => {
  let i = 0;
  debug("--------------- Start of debug cycle");
  return (log: any, color?: string) => {
    const isString = typeof log == "string";
    log = isString ? `${i}th: ${log}` : log;
    if (!isString) debug(`${i}th: `);
    debug(log, color);
    i += 1;
  };
};

export const findMatchedIndex = <X, Y>(
  xs: X[], // 원본
  ys: Y[], // 부분
  compare: (x: X, y: Y) => boolean,
  isReverse = false
) =>
  pipe(
    isReverse ? reverse(ys) : ys[Symbol.iterator](),
    map((y) => {
      for (let i = 0; i < xs.length; i++) {
        const idx = isReverse ? xs.length - 1 - i : i;
        const x = xs[idx];
        const result = compare(x, y);
        if (result) return idx;
      }
      return null;
    }),
    filter((idx: number | null) => idx != null),
    take(1),
    head,
    (x) => (typeof x == "number" ? x : -1)
  );
