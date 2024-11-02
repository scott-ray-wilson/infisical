import { Controller, useForm } from "react-hook-form";
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
  Select,
  SelectItem,
  TextArea
} from "@app/components/v2";
import { useWorkspace } from "@app/context";
import { EncryptionAlgorithm, TCmek, useCreateCmek, useUpdateCmek } from "@app/hooks/api/cmeks";

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

type FormProps = Props & {
  onComplete: () => void;
};

const ProjectTemplateForm = ({ onComplete }: FormProps) => {
  const {
    control,
    handleSubmit,
    register,
    formState: { isSubmitting, errors }
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {}
  });

  const handleCreateCmek = async ({ encryptionAlgorithm, name, description }: FormData) => {
    const mutation = isUpdate
      ? updateCmek.mutateAsync({ keyId: cmek.id, projectId, name, description })
      : createCmek.mutateAsync({
          projectId,
          encryptionAlgorithm,
          name,
          description
        });

    try {
      await mutation;
      createNotification({
        text: `Successfully ${isUpdate ? "updated" : "added"} key`,
        type: "success"
      });
      onComplete();
    } catch (err) {
      console.error(err);
      createNotification({
        text: `Failed to ${isUpdate ? "update" : "add"} key`,
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
        <Input autoFocus placeholder="my-secret-key" {...register("name")} />
      </FormControl>
      {!isUpdate && (
        <Controller
          control={control}
          name="encryptionAlgorithm"
          render={({ field: { onChange, ...field }, fieldState: { error } }) => (
            <FormControl label="Algorithm" errorText={error?.message} isError={Boolean(error)}>
              <Select defaultValue={field.value} onValueChange={onChange} className="w-full">
                {Object.entries(EncryptionAlgorithm)?.map(([key, value]) => (
                  <SelectItem value={value} key={`source-environment-${key}`}>
                    {key.replaceAll("_", "-")}
                  </SelectItem>
                ))}
              </Select>
            </FormControl>
          )}
        />
      )}
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
          {isUpdate ? "Update" : "Add"} Key
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
