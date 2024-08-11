import Head from "next/head";

import { UserSecretsPage } from "@app/views/UserSecretsPage";

const UserSecrets = () => {
  return (
    <>
      <Head>
        {/* TODO: use translations */}
        <title>User Secrets | Infisical</title>
        <link rel="icon" href="/infisical.ico" />
      </Head>
      <UserSecretsPage />
    </>
  );
};

export default UserSecrets;

UserSecrets.requireAuth = true;
