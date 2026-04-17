import { Helmet } from "react-helmet";

import { AuthPageBackground } from "@app/components/auth/AuthPageBackground";
import { AuthPageFooter } from "@app/components/auth/AuthPageFooter";
import { AuthPageHeader } from "@app/components/auth/AuthPageHeader";
import {
  UnstableCard,
  UnstableCardContent,
  UnstableCardHeader,
  UnstableCardTitle
} from "@app/components/v3";

import { ShareSecretForm } from "./components";

export const ShareSecretPage = () => {
  return (
    <div className="relative flex max-h-screen min-h-screen flex-col overflow-y-auto bg-linear-to-tr from-card via-bunker-900 to-card px-4">
      <AuthPageBackground />
      <Helmet>
        <title>Securely Share Secrets | Infisical</title>
        <link rel="icon" href="/infisical.ico" />
        <meta property="og:image" content="/images/message.png" />
        <meta property="og:title" content="" />
        <meta name="og:description" content="" />
      </Helmet>
      <AuthPageHeader />

      <UnstableCard className="z-50 m-auto w-full max-w-xl">
        <UnstableCardHeader>
          <UnstableCardTitle>Share a Secret</UnstableCardTitle>
        </UnstableCardHeader>
        <UnstableCardContent>
          <ShareSecretForm isPublic />
        </UnstableCardContent>
      </UnstableCard>

      <AuthPageFooter />
    </div>
  );
};
