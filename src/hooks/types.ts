import { Dispatch, ReactNode, SetStateAction, RefObject } from "react";
import { InViewHookResponse } from "react-intersection-observer";

export type InfiniteTypes = {
  direction: "top" | "bottom";
};

export type InfiniteHooks<Data> = {
  onAdd?: (params: {
    direction?: InfiniteTypes["direction"];
    items?: Data[];
    range: { start: number; end: number };
  }) => void;
  onRemove: (params: {
    direction?: InfiniteTypes["direction"];
    items?: Data[];
    range: { start: number; end: number };
  }) => void;
};

export type InfiniteCore<Data> = {
  selKey: (d: Data) => string; // 무한 스크롤 내에서 유일성을 보장할 key 값을 뽑는 함수
  fetchItems: (
    key: string,
    direction: InfiniteTypes["direction"]
  ) => Promise<any>; // 무한 스크롤에서 개별 아이템을 그리게 될때 쓰이는 아이템 데이터 리스트
  maxRenderCount: number; // 그릴 아이템 갯수
  pageRenderCount: number;
  items: Data[]; // 전체 데이터
  scrollElementRef: RefObject<HTMLDivElement | null>;
  top: {
    active: boolean;
    finish: boolean;
  };
  bottom: {
    active: boolean;
    finish: boolean;
  };
  resetCounter: number;
  hooks?: {
    onAdd: InfiniteHooks<Data>["onAdd"];
    onRemove: InfiniteHooks<Data>["onRemove"];
  };
  cssReverse?: boolean;
};

export type InfiniteProps<Data> = {
  className?: string;
  createItemView: (
    d: Data,
    ref: React.RefObject<unknown>
  ) => ReactNode | JSX.Element; // 데이터를 기반으로 Item 컴포넌트를 생성하는 함수
} & InfiniteCore<Data>;

export type InfiniteMaterials<Data> = {
  bottomObserver: InViewHookResponse;
  topObserver: InViewHookResponse;
  addItems: (newItems: Data[], direction: InfiniteTypes["direction"]) => void;
  infiniteItems: Data[];
  refs: RefObject<HTMLDivElement>[];
  initialized: boolean;
  // setInfiniteItems: Dispatch<SetStateAction<Data[]>>;
};
