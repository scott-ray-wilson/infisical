import { DynamicCaHierarchyFlow } from "./components";

type Props = {
  caId: string;
};

export const CaHierarchySection = ({ caId }: Props) => {
  return (
    <div className="mt-4 w-full rounded-lg border border-mineshaft-600 bg-mineshaft-900 p-4">
      <div className="flex items-center justify-between border-b border-mineshaft-400 pb-4">
        <h3 className="text-lg font-semibold text-mineshaft-100">CA Hierarchy</h3>
      </div>
      <div className="flex h-[40rem] min-h-[40rem] w-full py-4">
        <DynamicCaHierarchyFlow caId={caId} />
      </div>
    </div>
  );
};
