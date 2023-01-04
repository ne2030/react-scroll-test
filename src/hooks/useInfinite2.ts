import { createRef, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import { InfiniteCore, InfiniteMaterials, InfiniteTypes } from "./types";
import { last, take, takeRight, toArray } from "@fxts/core";
import { createOrderedDebug, findMatchedIndex } from "./util";
import { useRaf } from "./raf";

const addLog = (a: any) => {};

/**
 * @title 무한스크롤 hook
 * @caution 정렬이 바뀔 경우는 리셋 필요
 */

const noop = Symbol.for("noop");

const xor = (a: boolean, b: boolean) => a !== b;

const removeArr = <T>(arr: T[], n: number) => {
  if (n == 0) return arr;
  const isFront = n > 0;
  const len = arr.length;
  const dividePoint = n > 0 ? n : len + n;
  const a = [];
  for (let i = 0; i < len; i++) {
    if (xor(i < dividePoint, isFront)) a.push(arr[i]);
  }
  return a;
};

const createRetryInitialState = () => ({
  timer: null,
  top: null,
  bottom: null
});

export const useInfinite = <Data>(
  options: InfiniteCore<Data>
): InfiniteMaterials<Data> => {
  const {
    items,
    pageRenderCount,
    selKey,
    scrollElementRef,
    maxRenderCount,
    fetchItems,
    top: topState,
    bottom: bottomState,
    resetCounter,
    hooks: { onAdd } = {}
  } = options;

  useRaf();

  addLog("--------------------------------------------");

  const limitMaxItems = (
    newItems: Data[] | IterableIterator<Data>,
    direction: InfiniteTypes["direction"] = "top"
  ) => {
    const limitedItems = (direction === "top" ? take : takeRight)(
      maxRenderCount,
      newItems
    );

    return toArray(limitedItems);
  };

  const debug = createOrderedDebug();

  /*
   * 데이터 관리
   */

  // 축약된 데이터 목록 - 그릴 데이터만 관리
  const [infiniteItems, setInfiniteItems] = useState(limitMaxItems(items));
  const [initialized, setInitialized] = useState(false);
  const initializedRef = useRef(false); // 초기화 되는 사이클에는 부수효과 막기
  const scrollPositionRef = useRef<{ top: number; key: string } | null>(null);
  const rangeIdxRef = useRef<{ start: number; end: number } | null>(null);
  const changeStatusRef = useRef(false); // 동시에 상태 변화를 하는걸 막기 위한 장치
  const statusChangeDelayRef = useRef(false);
  const fetchStatusRef = useRef({ top: false, bottom: false });

  const keysRef = useRef<{ original: string[]; infinite: string[] }>({
    original: [],
    infinite: []
  });

  const changedItemsRef = useRef<{
    removed: string[];
    changed: { key: string; originIdx: number }[];
  }>({
    removed: [],
    changed: []
  });

  // key update & data change tracking
  // pure effect

  const syncAndTrackChanges = () => {
    if (!initialized || !initializedRef.current) return;

    const keys = {
      original: items.map(selKey),
      infinite: keysRef.current.infinite
    };

    keysRef.current = keys;
    updateRangeIdxRef();

    const removed: string[] = [];
    const changed: { key: string; originIdx: number }[] = [];

    infiniteItems.forEach((infiniteItem) => {
      const key = selKey(infiniteItem);

      const idx = keys.original.findIndex((originalKey) => originalKey == key);
      if (idx == -1) {
        removed.push(key);
        return;
      }

      if (infiniteItem != items[idx]) {
        addLog(JSON.stringify({ infi: infiniteItem, origin: items[idx] }));
        changed.push({ key, originIdx: idx });
      }
    });

    changedItemsRef.current = {
      removed: removed,
      changed: changed
    };

    addLog(JSON.stringify(changedItemsRef.current));
  };

  // should call after keysRef updated
  // TODO: 첫번째 마지막 아니더라도 찾을 수 있게 수정하기 (첫번째나 마지막이 원본에서 사라진 경우)
  // TODO: 위에 수정사항 테스트하기
  const updateRangeIdxRef = () => {
    const firstIdx = findMatchedIndex<string, string>(
      keysRef.current.original,
      keysRef.current.infinite,
      (x, y) => x == y
    );

    const lastIdx = findMatchedIndex<string, string>(
      keysRef.current.original,
      keysRef.current.infinite,
      (x, y) => x == y,
      true
    );

    rangeIdxRef.current = {
      start: firstIdx,
      end: lastIdx
    };
  };

  // dom 연결할 ref 어레이
  const refs = infiniteItems.map(() => createRef<HTMLDivElement>());

  const retryStateRef = useRef<{
    timer: ReturnType<typeof setTimeout> | null;
    top: string | null;
    bottom: string | null;
  }>(createRetryInitialState());
  const [shouldRetry, retry] = useState(0);

  /**
   * @dev 최초 데이터가 비동기로 올 경우 초기 셋팅, 초기화 안되어 있을 경우만
   * 초기화는 리셋 앞에 순서로 올 것
   */

  const initialize = () => {
    if (items.length > 0 && !initialized) {
      debug("initialize!!");
      const renderedItems = limitMaxItems(items);
      setInfiniteItems(renderedItems);
      setInitialized(true);
      initializedRef.current = true;
      keysRef.current = {
        original: items.map(selKey),
        infinite: renderedItems.map(selKey)
      };

      updateRangeIdxRef();
      if (onAdd && rangeIdxRef.current)
        onAdd({ range: rangeIdxRef.current, items: renderedItems });
    }
  };

  const reset = () => {
    if (initialized) {
      debug("reset!!", "color: red");
      setInfiniteItems([]);
      setInitialized(false);

      if (retryStateRef.current.timer) {
        clearTimeout(retryStateRef.current.timer);
      }

      initializedRef.current = false;
      scrollPositionRef.current = null;
      keysRef.current = { original: [], infinite: [] };
      rangeIdxRef.current = null;
      retryStateRef.current = createRetryInitialState();
      fetchStatusRef.current = { top: false, bottom: false };
    }
  };

  // 이전 값이랑 id 같으면 생성 안함
  const createRetryTimer = (direction: InfiniteTypes["direction"]) => {
    if (infiniteItems.length < 1) return;

    const baseItem =
      direction == "top"
        ? infiniteItems[0]
        : infiniteItems[infiniteItems.length - 1];

    const targetId = selKey(baseItem);

    if (retryStateRef.current[direction] != targetId) {
      retryStateRef.current[direction] = targetId;
      retryStateRef.current.timer = setTimeout(() => {
        debug(`retry timer! ${shouldRetry + 1}`);
        retry(shouldRetry + 1);
      }, 300);
    }
  };

  // 제거 / 추가를 다른 프레임으로 분리해서 진행 (스크롤 이슈 해결 위해서)
  const addItems = (
    newItems: Data[],
    direction: InfiniteTypes["direction"]
  ) => {
    const addToTop = direction == "top";
    const removeCount = Math.max(
      newItems.length + infiniteItems.length - maxRenderCount,
      0
    );

    const removeArrPosition = removeCount * (addToTop ? -1 : 1);
    const remainedItems = removeArr(infiniteItems, removeArrPosition);

    const finalItems =
      direction == "top"
        ? [...newItems, ...remainedItems]
        : [...remainedItems, ...newItems];

    // console.log("[remove]", {
    //   remainedItems,
    //   finalItems,
    //   infiniteItems,
    //   removeArrPosition,
    // });

    // remove 먼저
    setInfiniteItems(finalItems);
    keysRef.current = {
      original: keysRef.current.original,
      infinite: finalItems.map(selKey)
    };
    updateRangeIdxRef();

    const scrollBaseEl = removeArr(refs, removeArrPosition)[0].current;
    if (scrollBaseEl) {
      scrollPositionRef.current = {
        top: scrollBaseEl?.getBoundingClientRect().top,
        key: selKey(remainedItems[0])
      };
    }

    if (onAdd && rangeIdxRef.current)
      onAdd({
        direction, // add 와는 반대 방향 전달
        range: rangeIdxRef.current,
        items: finalItems
      });

    debug(
      `[remove, add] removed: ${removeCount}, removeArrPosition: ${removeArrPosition} `
    );

    addLog(
      `[add]: top(${scrollBaseEl?.getBoundingClientRect().top}), ref(${
        scrollBaseEl?.textContent
      }) removed(${removeCount}) item height: ${scrollBaseEl?.offsetHeight}`
    );

    statusChangeDelayRef.current = true;

    Promise.resolve().then(() => {
      console.log("proimse??? async??");
    });
  }; // 수동 아이템 데이터 추가

  /*
   * Effect 관리
   */

  const topObserver = useInView({
    /* Optional options */
    root: scrollElementRef.current,
    threshold: 0,
    // rootMargin: `${window.innerHeight}px 0px ${window.innerHeight}px 0px`,
    rootMargin: `0px 0px 0px 0px`
  });

  const bottomObserver = useInView({
    /* Optional options */
    root: scrollElementRef.current,
    threshold: 0,
    // rootMargin: `${window.innerHeight}px 0px ${window.innerHeight}px 0px`,
    rootMargin: `0px 0px 0px 0px`
  });

  const adjustScrollDiff = () => {
    const scrollPosition = scrollPositionRef.current;

    addLog(`scroll Position: ${!!scrollPosition}`);

    if (!scrollPosition || !initializedRef.current) return;

    const idx = infiniteItems.findIndex((n) => selKey(n) == scrollPosition.key);

    const scrollBaseEl = refs[idx]?.current;

    if (!scrollBaseEl) return;

    addLog(
      `[scroll] logged key: ${scrollPosition.key}, ref val: ${scrollBaseEl.textContent}`
    );

    const top = scrollBaseEl.getBoundingClientRect().top;

    const diff = top - scrollPosition.top;

    // 데이터 fetch 를 무한스크롤을 통해서 하는게 아니면 스크롤 조정 하지 않음 (다른 곳에서는 어떻게 쓰이게 될지 모르겠음)
    // if (toBeAdded.direction == "top" && topState.finish) return;

    addLog(
      `[scroll] adjustment: ${diff} (${scrollPosition.top} -> ${top}), (infi cnt: ${infiniteItems.length})`
    );
    debug(
      `Scroll by LayoutShift - infinite:  ${diff}`,
      Math.abs(diff) > 0 ? "color: red" : undefined
    );

    const scrollTarget = scrollElementRef.current || window;
    scrollTarget.scrollBy(0, diff);

    const children =
      scrollElementRef.current?.querySelectorAll(".infinite-test-item") || [];
    addLog(`[scroll] start top: ${top}, ${children[0]?.textContent || "-"}`);
  };

  const infiniteTopRenderer = () => {
    const direction = "top";
    if (!topState.active) return debug(`off out (${direction})`);
    if (!topObserver.inView) return debug(`inview out (${direction})`);
    if (!initializedRef.current || !initialized)
      return debug(`Initialize out(${direction})`);

    // retry 체크 타이머 제거
    if (retryStateRef.current.timer) {
      clearTimeout(retryStateRef.current.timer);
      retryStateRef.current.timer = null;
    }

    if (!rangeIdxRef.current) return;

    debug(`Observe:: (${direction}) `);

    if (rangeIdxRef.current?.start < pageRenderCount && !topState.finish) {
      if (fetchStatusRef.current.top) return;
      // fetch and wait "items" change
      debug(
        `need to fetch (${direction}) ${JSON.stringify({
          startRangeIdx: rangeIdxRef.current?.start,
          pageRenderCount,
          topItem: infiniteItems[0]
        })}`
      );
      createRetryTimer(direction);
      fetchItems(keysRef.current.infinite[0], direction).then(() => {
        fetchStatusRef.current = { ...fetchStatusRef.current, top: false };
      });
      fetchStatusRef.current = { ...fetchStatusRef.current, top: true };
      return;
    }

    if (rangeIdxRef.current?.start == 0)
      return debug(`out when already ${direction}`);

    const toBeAddedItems = items.slice(
      Math.max(0, rangeIdxRef.current?.start - pageRenderCount),
      rangeIdxRef.current?.start
    );

    if (toBeAddedItems.length === 0)
      return debug(`no items to be added (${direction})`);

    createRetryTimer(direction);

    if (changeStatusRef.current) return debug(`already changing: ${direction}`);
    changeStatusRef.current = true;

    addItems(toBeAddedItems, direction);
  };
  const infiniteBottomRenderer = () => {
    const direction = "bottom";
    if (!bottomState.active) return debug(`off out (${direction})`);
    if (!bottomObserver.inView) return debug(`inview out (${direction})`);
    if (!initializedRef.current || !initialized)
      return debug(`Initialize out(${direction})`);

    // retry 체크 타이머 제거
    if (retryStateRef.current.timer) {
      clearTimeout(retryStateRef.current.timer);
      retryStateRef.current.timer = null;
    }

    if (!rangeIdxRef.current) return;

    debug(`Observe:: (${direction})`);

    // 가지고 있는 아이템이 부족할 경우 추가 fetch
    // finish 인 경우는 끝
    console.log({
      rangeRef: rangeIdxRef.current,
      pageRenderCount,
      itemLen: items.length,
      finish: bottomState.finish
    });

    if (
      rangeIdxRef.current?.end + pageRenderCount + 1 > items.length &&
      !bottomState.finish
    ) {
      if (fetchStatusRef.current.bottom) return;
      debug(
        `need to fetch (${direction}) ${JSON.stringify({
          rangeEndIdx: rangeIdxRef.current?.end,
          pageRenderCount,
          bottomItem: infiniteItems[infiniteItems.length - 1]
        })}`
      );
      // fetch and wait "items" change
      createRetryTimer(direction);
      fetchItems(last(keysRef.current.infinite) as string, direction).then(
        () => {
          fetchStatusRef.current = { ...fetchStatusRef.current, bottom: false };
        }
      );
      fetchStatusRef.current = { ...fetchStatusRef.current, bottom: true };
      return;
    }

    const toBeAddedItems = items.slice(
      rangeIdxRef.current?.end + 1,
      rangeIdxRef.current?.end + 1 + pageRenderCount
    );

    // 추가할게 없으면, finish 훅 바로 호출하고 나감
    if (toBeAddedItems.length === 0) return debug(`Out:: (${direction})`);

    createRetryTimer(direction);

    if (changeStatusRef.current) return;
    changeStatusRef.current = true;

    addItems(toBeAddedItems, direction);
  };

  const adaptOriginalChanged = () => {
    if (!initialized || !initializedRef.current) return;
    if (changeStatusRef.current) return;

    if (
      changedItemsRef.current.changed.length == 0 &&
      changedItemsRef.current.removed.length == 0
    )
      return;

    addLog(`change sync`);

    // 정렬은 바뀌지 않는다는 전제로 했을 때, 성능 최적화 위해서 순서대로 찾음
    let changedIdx = 0;
    let removedIdx = 0;

    const updatedItems = infiniteItems
      .map((infiniteItem, idx) => {
        const key = keysRef.current.infinite[idx];

        const changed = changedItemsRef.current.changed[changedIdx];
        const removed = changedItemsRef.current.removed[removedIdx];

        if (removed && removed == key) {
          removedIdx += 1;
          return noop;
        }

        if (changed && changed.key == key) {
          changedIdx += 1;
          return items[changed.originIdx];
        }

        return infiniteItem;
      })
      .filter((x) => x !== noop) as Data[]; // filter 에서 심볼 거르는걸 추론 못해줌

    keysRef.current = {
      original: keysRef.current.original,
      infinite: updatedItems.map(selKey)
    };
    updateRangeIdxRef();

    changedItemsRef.current = {
      removed: [],
      changed: []
    };

    setInfiniteItems(updatedItems);
  };

  const offChangingStatus = () => {
    if (!statusChangeDelayRef.current) return;

    statusChangeDelayRef.current = false;
    changeStatusRef.current = false;
  };

  useEffect(reset, [resetCounter]);
  useEffect(initialize, [items, initialized]);
  useLayoutEffect(syncAndTrackChanges, [items]);
  useLayoutEffect(adjustScrollDiff, [infiniteItems]);

  useEffect(infiniteTopRenderer, [
    topObserver.inView,
    items,
    shouldRetry,
    topState.active,
    initialized // initilize 전에는 infiniteItems 가 없어서 진행 불가, 초기화 이후에 한번 더 확인 필요
  ]);

  useEffect(infiniteBottomRenderer, [
    bottomObserver.inView,
    items,
    shouldRetry,
    bottomState.active,
    initialized // initilize 전에는 infiniteItems 가 없어서 진행 불가, 초기화 이후에 한번 더 확인 필요
  ]);

  useEffect(adaptOriginalChanged, [items, changedItemsRef.current]);

  // 아래서 변경해야만 같은 사이클에서 다시 사용하는 시도를 막을 수 있음
  useEffect(offChangingStatus, [statusChangeDelayRef.current]);

  return {
    bottomObserver,
    topObserver,
    addItems,
    infiniteItems,
    // setInfiniteItems,
    refs,
    initialized
  };
};
