import Head from "next/head";

import { ProjectTemplatePage } from "@app/views/Org/ProjectTemplatePage";

const ProjectTemplate = () => {
  return (
    <div className="h-full bg-bunker-800">
      <Head>
        <title>Infisical | Project Template</title>
        <link rel="icon" href="/infisical.ico" />
      </Head>
      <ProjectTemplatePage />
    </div>
  );
};

export default ProjectTemplate;

ProjectTemplate.requireAuth = true;
