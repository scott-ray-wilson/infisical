import Head from "next/head";

import { ProjectTemplatesPage } from "@app/views/Org/ProjectTemplatesPage";

const ProjectTemplates = () => {
  return (
    <div className="h-full bg-bunker-800">
      <Head>
        <title>Infisical | Project Templates</title>
        <link rel="icon" href="/infisical.ico" />
      </Head>
      <ProjectTemplatesPage />
    </div>
  );
};

export default ProjectTemplates;

ProjectTemplates.requireAuth = true;
