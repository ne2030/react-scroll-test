import {
  delay,
  filter,
  last,
  map,
  pipe,
  range,
  reverse,
  sort,
  sortBy,
  toArray,
  uniq,
  uniqBy
} from "@fxts/core";
import { useEffect, useRef, useState } from "react";
import { InfiniteTypes } from "./types/types";
import { CietyScrollBar as CommentsScrollContainer } from "./ScrollContainer";
import { useInfinite } from "./hooks/useInfinite";

const log = console.log;

type TestItem = {
  id: string;
  value: number;
};

let i = 0;

const isReverse = false;

export const InfiniteTest = () => {
  const scrollElRef = useRef<HTMLDivElement>(null);

  log("%c Render!", "color: red");

  const [items, setItems] = useState<TestItem[] | null>(null);

  log(
    "[items]",
    (items || []).slice(0, 10).map((i) => i.value),
    items?.length
  );

  const [infinitePosition, setInfinitePosition] = useState<{
    recent: boolean;
    old: boolean;
    start: number;
    end: number;
  } | null>(null);

  const getItems = async (
    id: string,
    direction: InfiniteTypes["direction"]
  ) => {
    const val = +id;
    const isRecent = isReverse == (direction == "top");
    if (isRecent && val > 1000) return;
    if (!isRecent && val == 0) return;

    console.log("fetch request", { id, direction });

    const fetchCount = 40;

    i++;

    return delay(i > 10 ? 1000 * 5 : 500, 1).then(() => {
      const addedItems = pipe(
        isRecent
          ? range(val + 1, Math.min(val + fetchCount, 1000))
          : range(Math.max(val - fetchCount, 0), val - 1),
        map((n) => ({ value: n, id: n.toString() })),
        (xs) => (isReverse ? toArray(reverse(xs)) : toArray(xs)),
        filter((item) => {
          const found = (items || []).find((origin) => origin.id == item.id);
          return !found;
        }),
        toArray
      );
      log({ addedItems });
      const baseItems = items || [];
      const newItems =
        direction == "top"
          ? [...addedItems, ...baseItems]
          : [...baseItems, ...addedItems];

      setItems(newItems);
    });
  };

  useEffect(() => {
    delay(500, 1).then(() => {
      const newItems = pipe(
        range(0, 30),
        map((n) => ({ value: n, id: n.toString() })),
        (xs) => (isReverse ? toArray(reverse(xs)) : toArray(xs)),
        toArray
      );
      setItems(newItems);
    });
  }, []);

  const selKey = (item: TestItem) => item.id;

  const {
    infiniteItems,
    refs,
    addItems,
    initialized,
    bottomObserver,
    topObserver
  } = useInfinite<TestItem>({
    top: {
      finish: !!items && items[0]?.value == (isReverse ? 1000 : 0),
      active: true
    },
    bottom: {
      finish:
        !!items && items[items.length - 1]?.value === (isReverse ? 0 : 1000),
      active: true
    },
    resetCounter: 0,
    maxRenderCount: 100,
    scrollElementRef: scrollElRef,
    fetchItems: getItems,
    items: items || [],
    selKey,
    pageRenderCount: 30
  });

  log(
    "[infiniteItems]",
    (infiniteItems || []).slice(0, 10).map((i) => i.value),
    infiniteItems?.length
  );

  // iphone scroll test

  return (
    <div>
      <CommentsScrollContainer
        className="scroll-container"
        ref={scrollElRef}
        style={{
          overflowY: "auto",
          height: "100vh"
        }}
      >
        <div
          style={
            {
              // display: "flex",
              // justifyItems: "end",
              // flexDirection: "column-reverse"
            }
          }
        >
          <div className="top" ref={topObserver.ref}></div>
          {infiniteItems.map((item, idx) => {
            return (
              <div
                key={item.id}
                className={"infinite-test-item"}
                style={{
                  height: "3rem",
                  backgroundColor:
                    item.value % 2 == 0 ? "rgb(37 99 235)" : "rgb(252 211 77)",
                  textAlign: "center",
                  color: "white",
                  fontSize: "2rem",
                  padding: "1rem"
                }}
                ref={refs[idx]}
              >
                {item.value}
              </div>
            );
          })}
          <div className="bottom" ref={bottomObserver.ref}></div>
        </div>
      </CommentsScrollContainer>
    </div>
  );
};
