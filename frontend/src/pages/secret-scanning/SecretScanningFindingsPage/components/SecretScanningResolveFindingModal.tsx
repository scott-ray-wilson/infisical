import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button, FormControl, Modal, ModalClose, ModalContent, TextArea } from "@app/components/v2";
import { TSecretScanningFinding } from "@app/hooks/api/secretScanningV2";

type Props = {
  finding?: TSecretScanningFinding;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

const FormSchema = z.object({
  remark: z.string().optional()
});

type FormType = z.infer<typeof FormSchema>;

const Content = ({ finding }: Pick<Props, "finding">) => {
  const { handleSubmit, control } = useForm<FormType>({
    resolver: zodResolver(FormSchema)
  });

  const onSubmit = (data: FormType) => {};

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Controller
        control={control}
        name="remark"
        render={({ field, fieldState: { error } }) => {
          return (
            <FormControl label="Remarks" isError={Boolean(error)} errorText={error?.message}>
              <TextArea className="h-40 !resize-none" {...field} />
            </FormControl>
          );
        }}
      />
      <div className="flex w-full flex-row-reverse justify-between gap-4 pt-4">
        <Button
          type="submit"
          isLoading={isSubmitting}
          isDisabled={isSubmitting}
          colorSchema="secondary"
        >
          Mark as Resolved
        </Button>
        <ModalClose asChild>
          <Button colorSchema="secondary">Back</Button>
        </ModalClose>
      </div>
    </form>
  );
};

export const SecretScanningResolveFindingModal = ({ finding, isOpen, onOpenChange }: Props) => {
  if (!finding) return null;

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent title="Resolve Finding" subTitle="Mark this finding as resolved">
        <Content />
      </ModalContent>
    </Modal>
  );
};
