/* eslint-disable react/prop-types */

import * as React from "react";
import { cva, type VariantProps } from "cva";
import { AlertCircle, Check } from "lucide-react";

import { cn } from "../../utils";

type Orientation = "vertical" | "horizontal";
type StepStatus = "complete" | "current" | "pending" | "error";

interface StepperContextValue {
  activeStep: number;
  orientation: Orientation;
  onStepChange?: (index: number) => void;
}

const StepperContext = React.createContext<StepperContextValue | null>(null);

function useStepperContext() {
  const ctx = React.useContext(StepperContext);
  if (!ctx) {
    throw new Error("Stepper subcomponents must be used within <Stepper />");
  }
  return ctx;
}

interface StepperProps extends React.ComponentProps<"div"> {
  activeStep: number;
  orientation?: Orientation;
  onStepChange?: (index: number) => void;
}

function Stepper({
  activeStep,
  orientation = "vertical",
  onStepChange,
  className,
  ...props
}: StepperProps) {
  const value = React.useMemo(
    () => ({ activeStep, orientation, onStepChange }),
    [activeStep, orientation, onStepChange]
  );
  return (
    <StepperContext.Provider value={value}>
      <div
        data-slot="stepper"
        data-orientation={orientation}
        className={cn(
          "group/stepper flex",
          orientation === "vertical" ? "flex-col" : "flex-row",
          className
        )}
        {...props}
      />
    </StepperContext.Provider>
  );
}

interface StepperListProps extends Omit<React.ComponentProps<"ol">, "children"> {
  children: React.ReactNode;
}

function StepperList({ children, className, ...props }: StepperListProps) {
  const { orientation } = useStepperContext();
  const items = React.Children.toArray(children);
  return (
    <ol
      data-slot="stepper-list"
      className={cn(
        "flex",
        orientation === "vertical" ? "flex-col" : "w-full flex-row items-start",
        className
      )}
      {...props}
    >
      {items.map((child, i) => {
        if (!React.isValidElement<StepperStepInjectedProps>(child)) return child;
        return React.cloneElement(child, { isLast: i === items.length - 1 });
      })}
    </ol>
  );
}

const indicatorVariants = cva(
  "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      status: {
        complete: "border-success text-success",
        current: "border-warning text-warning ring-3 ring-warning/20",
        pending: "border-mineshaft-500 text-muted",
        error: "border-danger bg-danger/10 text-danger"
      }
    },
    defaultVariants: { status: "pending" }
  }
);

const titleVariants = cva("text-sm font-semibold leading-tight transition-colors", {
  variants: {
    status: {
      complete: "text-foreground",
      current: "text-foreground",
      pending: "text-muted",
      error: "text-danger"
    }
  },
  defaultVariants: { status: "pending" }
});

interface StepperStepInjectedProps {
  isLast?: boolean;
}

interface StepperStepProps
  extends Omit<React.ComponentProps<"li">, "title">,
    StepperStepInjectedProps,
    VariantProps<typeof indicatorVariants> {
  index: number;
  title: React.ReactNode;
  description?: React.ReactNode;
  status?: "error";
  disabled?: boolean;
}

function StepperStep({
  index,
  title,
  description,
  status: statusOverride,
  disabled,
  isLast,
  className,
  ...props
}: StepperStepProps) {
  const { activeStep, orientation, onStepChange } = useStepperContext();

  let computedStatus: StepStatus;
  if (statusOverride === "error") computedStatus = "error";
  else if (index < activeStep) computedStatus = "complete";
  else if (index === activeStep) computedStatus = "current";
  else computedStatus = "pending";

  const isClickable =
    !disabled &&
    Boolean(onStepChange) &&
    (computedStatus === "complete" || computedStatus === "error");

  let indicatorContent: React.ReactNode = index + 1;
  if (computedStatus === "complete") indicatorContent = <Check strokeWidth={3} />;
  else if (computedStatus === "error") indicatorContent = <AlertCircle />;

  const indicator = (
    <span
      aria-hidden="true"
      data-slot="stepper-indicator"
      data-status={computedStatus}
      className={cn(indicatorVariants({ status: computedStatus }))}
    >
      {indicatorContent}
    </span>
  );

  const labels = (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className={cn(titleVariants({ status: computedStatus }))}>{title}</span>
      {description ? <span className="text-xs leading-snug text-muted">{description}</span> : null}
    </div>
  );

  const connectorActive = computedStatus === "complete";

  if (orientation === "vertical") {
    const handleClick = isClickable ? () => onStepChange?.(index) : undefined;
    const Tag: "button" | "div" = isClickable ? "button" : "div";
    const interactiveProps = isClickable
      ? {
          type: "button" as const,
          onClick: handleClick,
          disabled
        }
      : {};

    return (
      <li
        data-slot="stepper-step"
        data-status={computedStatus}
        aria-current={computedStatus === "current" ? "step" : undefined}
        className={cn("flex gap-3", className)}
        {...props}
      >
        <div className="flex flex-col items-center">
          {indicator}
          {!isLast ? (
            <span
              aria-hidden="true"
              data-slot="stepper-connector"
              className={cn(
                "mt-1 w-px flex-1 transition-colors",
                connectorActive ? "bg-success/60" : "bg-mineshaft-500"
              )}
            />
          ) : null}
        </div>
        <Tag
          {...interactiveProps}
          className={cn(
            "flex flex-1 flex-col pt-0.5 text-left",
            !isLast && "pb-5",
            isClickable &&
              "-mx-1 cursor-pointer rounded-md px-1 outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
            !isClickable && "cursor-default"
          )}
        >
          {labels}
        </Tag>
      </li>
    );
  }

  // horizontal
  return (
    <li
      data-slot="stepper-step"
      data-status={computedStatus}
      aria-current={computedStatus === "current" ? "step" : undefined}
      className={cn("flex items-start gap-2", isLast ? "flex-none" : "flex-1", className)}
      {...props}
    >
      {isClickable ? (
        <button
          type="button"
          onClick={() => onStepChange?.(index)}
          disabled={disabled}
          className="flex shrink-0 cursor-pointer flex-col items-center gap-2 rounded-md text-center outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          {indicator}
          {labels}
        </button>
      ) : (
        <div className="flex shrink-0 cursor-default flex-col items-center gap-2 text-center">
          {indicator}
          {labels}
        </div>
      )}
      {!isLast ? (
        <span
          aria-hidden="true"
          data-slot="stepper-connector"
          className={cn(
            "mt-3.5 h-px flex-1 transition-colors",
            connectorActive ? "bg-success/60" : "bg-mineshaft-500"
          )}
        />
      ) : null}
    </li>
  );
}

export { Stepper, StepperList, StepperStep };
