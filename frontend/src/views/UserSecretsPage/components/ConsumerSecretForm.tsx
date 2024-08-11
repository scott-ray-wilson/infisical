import { ReactNode, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { createNotification } from "@app/components/notifications";
import {
  Button,
  FormControl,
  Input,
  Modal,
  ModalContent,
  Select,
  SelectItem,
  TextArea
} from "@app/components/v2";
import { InfisicalSecretInput } from "@app/components/v2/InfisicalSecretInput";
import { UserConsumerKeyPair } from "@app/hooks/api/consumer-keys/types";
import { useCreateConsumerSecret, useUpdateConsumerSecret } from "@app/hooks/api/consumer-secrets";
import { ConsumerSecretType, DecryptedConsumerSecret } from "@app/hooks/api/consumer-secrets/types";

const typeSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(ConsumerSecretType.Login),
    secretName: z.string().trim().min(1, { message: "Credential name is required" }),
    secretFieldOne: z.string().trim().min(1, { message: "Username is required" }),
    secretFieldTwo: z.string().trim().min(1, { message: "Password is required" }),
    secretFieldThree: z.string().max(0).default(""),
    secretFieldFour: z.string().max(0).default("")
  }),
  z.object({
    type: z.literal(ConsumerSecretType.CreditCard),
    secretName: z.string().trim().min(1, { message: "Credit Card name is required" }),
    secretFieldOne: z.string().trim().min(1, { message: "Card Number is required" }),
    secretFieldTwo: z.string().trim().min(1, { message: "CVV Code is required" }),
    secretFieldThree: z.string().trim().min(1, { message: "Expiry Date is required" }),
    secretFieldFour: z.string().max(0).default("")
  }),
  z.object({
    type: z.literal(ConsumerSecretType.Note),
    secretName: z.string().trim().min(1, { message: "Title is required" }),
    secretFieldOne: z.string().trim().min(1, { message: "Content is required" }),
    secretFieldTwo: z.string().max(0).default(""),
    secretFieldThree: z.string().max(0).default(""),
    secretFieldFour: z.string().max(0).default("")
  })
]);

type TFormSchema = z.infer<typeof typeSchema>;

type Props = {
  decryptConsumerKey: UserConsumerKeyPair;
  consumerSecret?: DecryptedConsumerSecret;
  // modal props
  isOpen?: boolean;
  onClose: () => void;
  onTogglePopUp: (isOpen: boolean) => void;
  orgId: string;
};

export const ConsumerSecretForm = ({
  decryptConsumerKey,
  isOpen,
  orgId,
  consumerSecret,
  onClose,
  onTogglePopUp
}: Props) => {
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { isSubmitting, errors }
  } = useForm<TFormSchema>({
    defaultValues: { type: ConsumerSecretType.Login },
    resolver: zodResolver(typeSchema)
  });
  const isEdit = Boolean(consumerSecret);
  const consumerSecretType = watch("type");

  useEffect(() => {
    reset(
      consumerSecret || {
        type: ConsumerSecretType.Login,
        secretName: "",
        secretFieldOne: "",
        secretFieldTwo: "",
        secretFieldThree: "",
        secretFieldFour: ""
      }
    );
  }, [consumerSecret]);

  const { mutateAsync: createConsumerSecret } = useCreateConsumerSecret();
  const { mutateAsync: updateConsumerSecret } = useUpdateConsumerSecret();

  const handleFormSubmit = async (form: TFormSchema) => {
    try {
      if (isEdit) {
        await updateConsumerSecret({
          consumerSecretId: consumerSecret?.id!,
          latestFileKey: decryptConsumerKey,
          orgId,
          ...form
        });
      } else {
        await createConsumerSecret({
          latestFileKey: decryptConsumerKey,
          orgId,
          ...form
        });
      }
      createNotification({
        type: "success",
        text: `Personal secret ${isEdit ? "updated" : "created"} successfully`
      });
      onClose();
      reset();
    } catch (e) {
      createNotification({
        type: "error",
        text: `Failed to ${isEdit ? "update" : "create"} personal secret`
      });
    }
  };

  let FieldComponents: ReactNode;
  switch (consumerSecretType) {
    case ConsumerSecretType.Login:
      FieldComponents = (
        <>
          <FormControl
            label="Name"
            isError={Boolean(errors?.secretName)}
            errorText={errors?.secretName?.message}
          >
            <Input {...register("secretName")} placeholder="Credentials Name (ie Github Login)" />
          </FormControl>
          <FormControl
            label="Username"
            isError={Boolean(errors?.secretFieldOne)}
            errorText={errors?.secretFieldOne?.message}
          >
            <Input {...register("secretFieldOne")} />
          </FormControl>
          <Controller
            control={control}
            name="secretFieldTwo"
            render={({ field }) => (
              <FormControl
                label="Password"
                isError={Boolean(errors?.secretFieldTwo)}
                errorText={errors?.secretFieldTwo?.message}
              >
                <InfisicalSecretInput
                  {...field}
                  containerClassName="text-bunker-300 hover:border-primary-400/50 border border-mineshaft-600 bg-mineshaft-900 px-2 py-1.5"
                />
              </FormControl>
            )}
          />
        </>
      );
      break;
    case ConsumerSecretType.CreditCard:
      FieldComponents = (
        <>
          <FormControl
            label="Name"
            isError={Boolean(errors?.secretName)}
            errorText={errors?.secretName?.message}
          >
            <Input {...register("secretName")} placeholder="Card Name" />
          </FormControl>
          <Controller
            control={control}
            name="secretFieldOne"
            render={({ field }) => (
              <FormControl
                label="Card Number"
                isError={Boolean(errors?.secretFieldOne)}
                errorText={errors?.secretFieldOne?.message}
              >
                <InfisicalSecretInput
                  {...field}
                  containerClassName="text-bunker-300 hover:border-primary-400/50 border border-mineshaft-600 bg-mineshaft-900 px-2 py-1.5"
                />
              </FormControl>
            )}
          />
          <div className="flex items-center justify-between gap-2">
            <Controller
              control={control}
              name="secretFieldTwo"
              render={({ field }) => (
                <FormControl
                  className="flex-1"
                  label="Security Code (CVV)"
                  isError={Boolean(errors?.secretFieldTwo)}
                  errorText={errors?.secretFieldTwo?.message}
                >
                  <InfisicalSecretInput
                    {...field}
                    containerClassName="text-bunker-300 hover:border-primary-400/50 border border-mineshaft-600 bg-mineshaft-900 px-2 py-1.5"
                  />
                </FormControl>
              )}
            />
            <FormControl
              label="Expiry Date"
              isError={Boolean(errors?.secretFieldThree)}
              errorText={errors?.secretFieldThree?.message}
              className="flex-1"
            >
              <Input {...register("secretFieldThree")} />
            </FormControl>
          </div>
        </>
      );
      break;
    case ConsumerSecretType.Note:
      FieldComponents = (
        <>
          <FormControl
            label="Name"
            isError={Boolean(errors?.secretName)}
            errorText={errors?.secretName?.message}
          >
            <Input {...register("secretName")} placeholder="Title" />
          </FormControl>
          <FormControl
            label="Content"
            isError={Boolean(errors?.secretFieldOne)}
            errorText={errors?.secretFieldOne?.message}
          >
            <TextArea
              className="min-h-[12rem] border-mineshaft-500 bg-mineshaft-900"
              {...register("secretFieldOne")}
            />
          </FormControl>
        </>
      );
      break;
    default:
    // throw new Error(`Unsupported type ${consumerSecretType}`);
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={onTogglePopUp}>
      <ModalContent
        className="max-h-[80vh] overflow-y-auto"
        title={`${isEdit ? "Edit" : "Create"} Personal Secret`}
        subTitle={
          isEdit
            ? `Update your ${consumerSecretType.replace("-", " ")} secret`
            : "Store login credentials, credit cards or secure notes"
        }
      >
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <Controller
            control={control}
            name="type"
            render={({ field: { onChange, ...field }, fieldState: { error } }) => (
              <FormControl label="Type" errorText={error?.message} isError={Boolean(error)}>
                <Select
                  isDisabled={isEdit}
                  defaultValue={consumerSecret?.type ?? field.value}
                  {...field}
                  onValueChange={(e) => {
                    onChange(e);
                    reset({
                      type: e as ConsumerSecretType,
                      secretName: "",
                      secretFieldOne: "",
                      secretFieldTwo: "",
                      secretFieldThree: "",
                      secretFieldFour: ""
                    });
                  }}
                  className="w-full border border-mineshaft-600 capitalize"
                >
                  {Object.values(ConsumerSecretType).map((type) => (
                    <SelectItem className="capitalize" value={type} key={type}>
                      {type.replace("-", " ")}
                    </SelectItem>
                  ))}
                </Select>
              </FormControl>
            )}
          />
          {FieldComponents}
          <div className="mt-7 flex items-center">
            <Button
              isDisabled={isSubmitting}
              isLoading={isSubmitting}
              key="layout-create-project-submit"
              className="mr-4"
              type="submit"
            >
              {isEdit ? "Update" : "Create"} Personal Secret
            </Button>
            <Button
              key="layout-cancel-create-project"
              onClick={onClose}
              variant="plain"
              colorSchema="secondary"
            >
              Cancel
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
};
