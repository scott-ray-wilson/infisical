import { useTranslation } from "react-i18next";
import Head from "next/head";

import { SecretSyncOverview } from "@app/views/IntegrationsPage/SecretSyncOverview";

export default function SecretSyncPage() {
  const { t } = useTranslation();

  return (
    <>
      <Head>
        <title>Secret Sync | Infisical</title>
        <link rel="icon" href="/infisical.ico" />
        <meta property="og:image" content="/images/message.png" />
        <meta property="og:title" content="Manage your .env files in seconds" />
        <meta name="og:description" content={t("integrations.description") as string} />
      </Head>
      <SecretSyncOverview />
    </>
  );
}

SecretSyncPage.requireAuth = true;
