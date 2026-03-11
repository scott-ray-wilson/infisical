import { IconDefinition } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import {
  Badge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  UnstableIconButton
} from "@app/components/v3";

type Props = {
  icon: IconDefinition;
  label: string;
  onClick: () => void;
  showLastUsed?: boolean;
};

export const SocialLoginButton = ({ icon, label, onClick, showLastUsed }: Props) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <div className="relative w-full">
        <UnstableIconButton
          aria-label={label}
          variant="outline"
          size="lg"
          isFullWidth
          onClick={onClick}
        >
          <FontAwesomeIcon icon={icon} />
        </UnstableIconButton>
        {showLastUsed && (
          <Badge variant="project" className="absolute -top-2 -right-2 rounded-full">
            Last used
          </Badge>
        )}
      </div>
    </TooltipTrigger>
    <TooltipContent side="bottom">{label}</TooltipContent>
  </Tooltip>
);
