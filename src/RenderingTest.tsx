import {
  useInsertionEffect,
  useState,
  useRef,
  createRef,
  useEffect,
  useLayoutEffect
} from "react";
import { CietyScrollBar as CommentsScrollContainer } from "./ScrollContainer";
import { Item } from "./Item";
import { map, toArray, range } from "@fxts/core";
import UAParser from "ua-parser-js";

var parser = new UAParser();
const { browser } = parser.getResult();

export const RenderingTest = () => {
  const [list, setList] = useState<{ val: number; removed: boolean }[]>([]);
  const scrollElRef = useRef<HTMLDivElement | null>(null);

  const refs = list.map((i) => createRef<HTMLDivElement>());

  useEffect(() => {
    setList(toArray(range(0, 100)).map((val) => ({ val, removed: false })));
  }, []);

  // useEffect(() => {
  //   setInterval(() => {
  //     if (scrollElRef.current) {
  //       scrollElRef.current.scrollBy({ left: 0, top: 400, behavior: "smooth" });
  //       console.log("scroll!!!");
  //     }
  //   }, 1000);
  // }, []);

  useEffect(() => {
    setTimeout(() => {
      setList(
        toArray(range(20, 100)).map((i) => {
          if (i < 20) return { val: i, removed: true };
          return { val: i, removed: false };
        })
      );
    }, 1000);
  }, []);

  // useLayoutEffect(() => {
  //   if (scrollElRef.current) {
  //     console.log(browser);

  //     if (browser.name.toLowerCase().includes("safari")) {
  //       scrollElRef.current.scrollBy(0, -80 * 20);
  //       scrollElRef.current.getBoundingClientRect();
  //     }
  //   }
  // }, [list]);

  useLayoutEffect(() => {
    if (scrollElRef.current) {
      requestAnimationFrame(() => {
        if (browser.name.toLowerCase().includes("safari")) {
          scrollElRef.current.scrollBy(0, -80 * 20);
        }
      });
    }
  }, [list]);

  useEffect(() => {}, [list]);

  useEffect(() => {
    setTimeout(() => {
      if (scrollElRef.current) scrollElRef.current.scrollTo(0, 2000);
    }, 100);
  }, []);

  return (
    <CommentsScrollContainer
      className="scroll-container"
      ref={scrollElRef}
      style={{
        overflowY: "auto",
        height: "100vh",
        transform: "translate3d(0, 0, 0)"
        // willChange: "scroll-position"
      }}
    >
      {list.map((i, idx) => (
        <Item id={i.val} key={i.val} ref={refs[idx]} removed={i.removed} />
      ))}
    </CommentsScrollContainer>
  );
};
