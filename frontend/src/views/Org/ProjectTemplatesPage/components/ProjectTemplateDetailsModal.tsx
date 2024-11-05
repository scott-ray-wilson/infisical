import { useForm } from "react-hook-form";
import { useRouter } from "next/router";
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
import { useOrganization } from "@app/context";
import {
  TProjectTemplate,
  useCreateProjectTemplate,
  useUpdateProjectTemplate
} from "@app/hooks/api/projectTemplates";

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
  projectTemplate?: TProjectTemplate;
};

type FormProps = {
  projectTemplate?: TProjectTemplate;
  onComplete: () => void;
};

const ProjectTemplateForm = ({ onComplete, projectTemplate }: FormProps) => {
  const createProjectTemplate = useCreateProjectTemplate();
  const updateProjectTemplate = useUpdateProjectTemplate();
  const router = useRouter();
  const { currentOrg } = useOrganization();

  const {
    handleSubmit,
    register,
    formState: { isSubmitting, errors }
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: projectTemplate?.name,
      description: projectTemplate?.description
    }
  });

  const onFormSubmit = async (data: FormData) => {
    const mutation = projectTemplate
      ? updateProjectTemplate.mutateAsync({ templateId: projectTemplate.id, ...data })
      : createProjectTemplate.mutateAsync(data);
    try {
      const template = await mutation;
      createNotification({
        text: `Successfully ${
          projectTemplate ? "updated template details" : "created project template"
        }`,
        type: "success"
      });

      if (!projectTemplate) router.push(`/org/${currentOrg?.id}/project-templates/${template.id}`);
      onComplete();
    } catch (err) {
      console.error(err);
      createNotification({
        text: `Failed to ${
          projectTemplate ? "update template details" : "create project template"
        }`,
        type: "error"
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)}>
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
          {projectTemplate ? "Update" : "Add"} Template
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

export const ProjectTemplateDetailsModal = ({ isOpen, onOpenChange, projectTemplate }: Props) => {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent
        title={projectTemplate ? "Edit Project Template Details" : "Create Project Template"}
      >
        <ProjectTemplateForm
          projectTemplate={projectTemplate}
          onComplete={() => onOpenChange(false)}
        />
      </ModalContent>
    </Modal>
  );
};
