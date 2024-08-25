import dynamic from "next/dynamic";

import type { RichTextSearchInputType } from "./RichTextSearchInput";

// TODO: resolve server unable to find module "jsx-runtime.js" to remove dynamic import
export const DynamicRichTextSearchInput = dynamic(
  async () =>
    import("./RichTextSearchInput").then(({ RichTextSearchInput }) => RichTextSearchInput),
  {
    ssr: false,
    loading: () => <p>Loading...</p> // TODO
  }
) as RichTextSearchInputType;
