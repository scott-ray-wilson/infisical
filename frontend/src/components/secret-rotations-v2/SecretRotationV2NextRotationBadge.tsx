import { faRotate } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { addDays, differenceInDays, format } from "date-fns";
import { twMerge } from "tailwind-merge";

import { Tooltip } from "@app/components/v2";
import { Badge, BadgeProps } from "@app/components/v2/Badge/Badge";
import { TSecretRotationV2 } from "@app/hooks/api/secretRotationsV2";

type Props = {
  secretRotation: TSecretRotationV2;
  className?: string;
};

export const SecretRotationV2NextRotationBadge = ({ secretRotation, className }: Props) => {
  const { lastRotatedAt, interval, createdAt } = secretRotation;

  const rotationDate = addDays(lastRotatedAt ?? createdAt, interval);
  const daysToRotation = differenceInDays(rotationDate, new Date());

  let variant: BadgeProps["variant"];
  let label: string;
  let tooltipContent: string;

  if (daysToRotation >= 7) {
    variant = "success";
    label = `Rotates in ${daysToRotation} Days`;
    tooltipContent = `Rotates on ${format(rotationDate, "MM/dd/yyyy")} at ${format(rotationDate, "hh:mm aa")}.`;
  } else if (daysToRotation < 0) {
    variant = "danger";
    label = "Rotation Past Due";
    tooltipContent = `Rotation due on ${format(rotationDate, "MM/dd/yyyy")} at ${format(rotationDate, "hh:mm aa")}.`;
  } else if (daysToRotation === 0) {
    variant = "primary";
    label = "Rotates Today";
    tooltipContent = `Rotates at ${format(rotationDate, "hh:mm aa")}.`;
  } else {
    variant = "primary";
    label = `Rotates in ${daysToRotation} Days`;
    tooltipContent = `Rotates on ${format(rotationDate, "MM/dd/yyyy")} at ${format(rotationDate, "hh:mm aa")}.`;
  }

  return (
    <Tooltip className="max-w-lg" content={tooltipContent}>
      <div>
        <Badge
          variant={variant}
          className={twMerge("flex h-5 w-min items-center gap-1.5 whitespace-nowrap", className)}
        >
          <FontAwesomeIcon icon={faRotate} />
          {label}
        </Badge>
      </div>
    </Tooltip>
  );
};
