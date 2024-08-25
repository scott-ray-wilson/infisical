import dynamic from "next/dynamic";

import type { RichTextSearchInputType } from "./RichTextSearchInput";

// TODO: resolve server unable to find module "jsx-runtime.js"
//  to remove dynamic import (lexical dep issue with react 17)
export const DynamicRichTextSearchInput = dynamic(
  async () =>
    import("./RichTextSearchInput").then(({ RichTextSearchInput }) => RichTextSearchInput),
  {
    ssr: false,
    // display dummy html of search input on load until above is resolved
    loading: () => (
      <div className="relative my-4 inline-flex w-full items-center rounded-md border border-mineshaft-500 bg-mineshaft-600 font-inter text-gray-400">
        <button
          aria-disabled="false"
          type="button"
          aria-label="Add filter"
          className="button user-select-none relative inline-flex cursor-pointer items-center justify-center rounded-md rounded-r-none border border-mineshaft-600 bg-mineshaft-600 py-3 px-3 font-inter text-sm font-medium text-bunker-200 transition-all duration-100 hover:border-primary/60 hover:bg-primary/[0.15] hover:text-bunker-100 hover:opacity-80"
          id="radix-80"
          aria-haspopup="menu"
          aria-expanded="false"
          data-state="closed"
        >
          <svg
            aria-hidden="true"
            focusable="false"
            data-prefix="fas"
            data-icon="filter"
            className="svg-inline--fa fa-filter "
            role="img"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512"
          >
            <path
              fill="currentColor"
              d="M3.9 54.9C10.5 40.9 24.5 32 40 32H472c15.5 0 29.5 8.9 36.1 22.9s4.6 30.5-5.2 42.5L320 320.9V448c0 12.1-6.8 23.2-17.7 28.6s-23.8 4.3-33.5-3l-64-48c-8.1-6-12.8-15.5-12.8-25.6V320.9L9 97.3C-.7 85.4-2.8 68.8 3.9 54.9z"
            />
          </svg>
        </button>
        <div
          className="input mr-[0.075rem] ml-0.5 w-full min-w-[20rem] rounded-md rounded-l-none bg-mineshaft-800 py-[0.5rem] pr-10 pl-3 text-sm text-gray-400 text-gray-400 outline-none duration-100 hover:ring-bunker-400/60 focus:ring-2 focus:ring-1 focus:ring-primary-400/50"
          role="textbox"
          spellCheck="true"
          data-lexical-editor="true"
        >
          <p>
            <br />
          </p>
        </div>
        <div className="pointer-events-none absolute left-[3.375rem] text-sm text-gray-400">
          Filter by text or keywords...
        </div>
        <button
          aria-disabled="false"
          type="button"
          aria-label="Clear filters"
          className="button user-select-none pointer-events-none absolute right-2 top-[0.6rem] inline-flex cursor-pointer items-center justify-center rounded-md border-mineshaft bg-transparent py-1 px-1 font-inter text-sm font-medium text-bunker-300 opacity-0 transition-opacity duration-200 hover:bg-bunker-400"
        >
          <svg
            aria-hidden="true"
            focusable="false"
            data-prefix="fas"
            data-icon="filter-circle-xmark"
            className="svg-inline--fa fa-filter-circle-xmark "
            role="img"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 576 512"
          >
            <path
              fill="currentColor"
              d="M3.9 22.9C10.5 8.9 24.5 0 40 0H472c15.5 0 29.5 8.9 36.1 22.9s4.6 30.5-5.2 42.5L396.4 195.6C316.2 212.1 256 283 256 368c0 27.4 6.3 53.4 17.5 76.5c-1.6-.8-3.2-1.8-4.7-2.9l-64-48c-8.1-6-12.8-15.5-12.8-25.6V288.9L9 65.3C-.7 53.4-2.8 36.8 3.9 22.9zM432 224a144 144 0 1 1 0 288 144 144 0 1 1 0-288zm59.3 107.3c6.2-6.2 6.2-16.4 0-22.6s-16.4-6.2-22.6 0L432 345.4l-36.7-36.7c-6.2-6.2-16.4-6.2-22.6 0s-6.2 16.4 0 22.6L409.4 368l-36.7 36.7c-6.2 6.2-6.2 16.4 0 22.6s16.4 6.2 22.6 0L432 390.6l36.7 36.7c6.2 6.2 16.4 6.2 22.6 0s6.2-16.4 0-22.6L454.6 368l36.7-36.7z"
            />
          </svg>
        </button>
      </div>
    )
  }
) as RichTextSearchInputType;
