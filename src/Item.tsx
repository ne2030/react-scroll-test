import { memo, RefObject, forwardRef } from "react";

export const Item = memo(
  forwardRef(
    (
      { id, removed }: { id: number; removed: boolean },
      ref: RefObject<HTMLDivElement>
    ) => {
      return (
        <div
          key={id}
          ref={ref}
          className={"infinite-test-item"}
          style={{
            height: "3rem",
            backgroundColor:
              +id % 2 == 0 ? "rgb(37 99 235)" : "rgb(252 211 77)",
            textAlign: "center",
            color: "white",
            fontSize: "2rem",
            padding: "1rem",
            // transform: "translate3d(0, 0, 0)",
            ...(removed ? { height: 0, overflow: "hidden", padding: 0 } : {})
          }}
        >
          {id}
        </div>
      );
    }
  )
);
