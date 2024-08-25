import dynamic from "next/dynamic";

// TODO: resolve server unable to find module "jsx-runtime.js"
//  to remove dynamic import (lexical dep issue with react 17)
export const DynamicCaHierarchyFlow = dynamic(
  async () => import("./CaHierarchyFlow").then(({ CaHierarchyFlow }) => CaHierarchyFlow),
  {
    ssr: false,
    // display dummy html of search input on load until above is resolved
    loading: () => <p>Loading...</p>
  }
);
