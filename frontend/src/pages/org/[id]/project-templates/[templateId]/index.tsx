import Head from "next/head";

const ProjectTemplate = () => {
  return (
    <div className="h-full bg-bunker-800">
      <Head>
        <title>Infisical | Project Template</title>
        <link rel="icon" href="/infisical.ico" />
      </Head>
      hi
    </div>
  );
};

export default ProjectTemplate;

ProjectTemplate.requireAuth = true;
