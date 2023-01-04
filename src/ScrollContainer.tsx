import { forwardRef, MutableRefObject, UIEvent, useRef } from "react";

type Props = React.HTMLAttributes<HTMLElement> & {
  useMobileKeyboardClose?: boolean;
  children: React.ReactNode;
  overflowAuto?: boolean;
};

export type CietyScrollBarRef = HTMLDivElement | null;

type FocusElement = HTMLDivElement | HTMLInputElement | HTMLTextAreaElement;

export const CietyScrollBar = forwardRef<CietyScrollBarRef, Props>(
  ({ children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        onScrollCapture={props.onScrollCapture}
        className={`${props.className ?? ""}`}
        style={props.style}
      >
        {children}
      </div>
    );
  }
);
