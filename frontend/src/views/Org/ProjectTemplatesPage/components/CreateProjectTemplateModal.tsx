import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import slugify from "@sindresorhus/slugify";
import { z } from "zod";

import { createNotification } from "@app/components/notifications";
import {
  Button,
  FormControl,
  Input,
  Modal,
  ModalClose,
  ModalContent,
  TextArea
} from "@app/components/v2";
import { useCreateProjectTemplate } from "@app/hooks/api/projectTemplates";

const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .toLowerCase()
    .refine((v) => slugify(v) === v, {
      message: "Name must be in slug format"
    }),
  description: z.string().max(500).optional()
});

export type FormData = z.infer<typeof formSchema>;

type Props = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

type FormProps = {
  onComplete: () => void;
};

const ProjectTemplateForm = ({ onComplete }: FormProps) => {
  const createProjectTemplate = useCreateProjectTemplate();

  const {
    handleSubmit,
    register,
    formState: { isSubmitting, errors }
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {}
  });

  const handleCreateCmek = async (data: FormData) => {
    try {
      await createProjectTemplate.mutateAsync(data);
      createNotification({
        text: "Successfully created project template",
        type: "success"
      });
      onComplete();
    } catch (err) {
      console.error(err);
      createNotification({
        text: "Failed to create project template",
        type: "error"
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(handleCreateCmek)}>
      <FormControl
        helperText="Name must be slug-friendly"
        errorText={errors.name?.message}
        isError={Boolean(errors.name?.message)}
        label="Name"
      >
        <Input autoFocus placeholder="my-project-template" {...register("name")} />
      </FormControl>
      <FormControl
        label="Description (optional)"
        errorText={errors.description?.message}
        isError={Boolean(errors.description?.message)}
      >
        <TextArea
          className="max-h-[20rem] min-h-[10rem] min-w-full max-w-full"
          {...register("description")}
        />
      </FormControl>
      <div className="flex items-center">
        <Button
          className="mr-4"
          size="sm"
          type="submit"
          isLoading={isSubmitting}
          isDisabled={isSubmitting}
        >
          Add Template
        </Button>
        <ModalClose asChild>
          <Button colorSchema="secondary" variant="plain">
            Cancel
          </Button>
        </ModalClose>
      </div>
    </form>
  );
};

export const CreateProjectTemplateModal = ({ isOpen, onOpenChange }: Props) => {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent title="Create Template">
        <ProjectTemplateForm onComplete={() => onOpenChange(false)} />
      </ModalContent>
    </Modal>
  );
};
