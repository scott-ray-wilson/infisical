import { createNotification } from "@app/components/notifications";
import { DeleteActionModal } from "@app/components/v2";
import { TCmek, useDeleteCmek } from "@app/hooks/api/cmeks";
import { TProjectTemplate, useDeleteProjectTemplate } from "@app/hooks/api/projectTemplates";

type Props = {
  template?: TProjectTemplate;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export const DeleteProjectTemplateModal = ({ isOpen, onOpenChange, template }: Props) => {
  const deleteTemplate = useDeleteProjectTemplate();

  if (!template) return null;

  const { id: templateId, name } = template;

  const handleDeleteCmek = async () => {
    try {
      await deleteTemplate.mutateAsync({
        templateId
      });

      createNotification({
        text: "Project template successfully deleted",
        type: "success"
      });

      onOpenChange(false);
    } catch (err) {
      console.error(err);
      const error = err as any;
      const text = error?.response?.data?.message ?? "Failed to delete project template";

      createNotification({
        text,
        type: "error"
      });
    }
  };

  return (
    <DeleteActionModal
      isOpen={isOpen}
      title={`Are you sure want to delete ${name}?`}
      onChange={onOpenChange}
      deleteKey="confirm"
      onDeleteApproved={handleDeleteCmek}
    />
  );
};
