import { forwardRef, ReactNode, useEffect, useRef } from "react";
import { DotLottie, DotLottieReact, Mode } from "@lottiefiles/dotlottie-react";

export type LottieProps = {
  // Kudos to https://itnext.io/react-polymorphic-components-with-typescript-f7ce72ea7af2
  children?: ReactNode;
  icon?: string;
  iconMode?: Mode;
  className?: string;
  isAutoPlay?: boolean;
  frame?: number;
  setFrame?: (frame: number) => void;
};

export const Lottie = forwardRef<HTMLDivElement, LottieProps>(
  ({ children, icon, iconMode, isAutoPlay, frame, setFrame, ...props }, ref): JSX.Element => {
    const iconRef = useRef<DotLottie | null>(null);

    useEffect(() => {
      if (iconRef.current && frame) {
        iconRef.current.setFrame(frame);
        if (setFrame) setFrame(0);
      }

      return () => {
        console.log("current frame", iconRef.current?.currentFrame);
        if (iconRef.current?.currentFrame && setFrame) setFrame(iconRef.current?.currentFrame);
      };
    }, [iconRef.current]);

    useEffect(() => {
      console.log("initial frame", frame);
    }, []);

    return (
      <div
        onMouseEnter={() => iconRef.current?.play()}
        onMouseLeave={() => iconRef.current?.stop()}
        {...props}
        ref={ref}
      >
        <DotLottieReact
          dotLottieRefCallback={(el) => {
            iconRef.current = el;
            console.log("total Frames", iconRef.current?.currentFrame);
          }}
          // segment={frame ? [frame, 200] : [0, 200]}
          mode={iconMode}
          src={`/lotties/${icon}.json`}
          loop
          autoplay={isAutoPlay}
          className="h-full w-full"
        />
        {children}
      </div>
    );
  }
);
