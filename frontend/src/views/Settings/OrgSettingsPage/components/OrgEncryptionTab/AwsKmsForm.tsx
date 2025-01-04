import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createNotification } from "@app/components/notifications";
import { Badge, Button, FormControl, Input, Select, SelectItem } from "@app/components/v2";
import { useOrganization } from "@app/context";
import { AWS_REGIONS } from "@app/helpers/appConnections";
import { useAddExternalKms, useUpdateExternalKms } from "@app/hooks/api";
import {
  AddExternalKmsSchema,
  AddExternalKmsType,
  ExternalKmsProvider,
  Kms,
  KmsAwsCredentialType
} from "@app/hooks/api/kms/types";

type Props = {
  onCompleted: () => void;
  onCancel: () => void;
  kms?: Kms;
};

export const AwsKmsForm = ({ onCompleted, onCancel, kms }: Props) => {
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting }
  } = useForm<AddExternalKmsType>({
    resolver: zodResolver(AddExternalKmsSchema),
    defaultValues: {
      name: kms?.name,
      description: kms?.description ?? "",
      provider: {
        type: ExternalKmsProvider.Aws,
        inputs: {
          credential: {
            type: kms?.external?.providerInput?.credential?.type,
            data: {
              accessKey: kms?.external?.providerInput?.credential?.data?.accessKey,
              secretKey: kms?.external?.providerInput?.credential?.data?.secretKey,
              assumeRoleArn: kms?.external?.providerInput?.credential?.data?.assumeRoleArn,
              externalId: kms?.external?.providerInput?.credential?.data?.externalId
            }
          },
          awsRegion: kms?.external?.providerInput?.awsRegion,
          kmsKeyId: kms?.external?.providerInput?.kmsKeyId
        }
      }
    }
  });

  const { currentOrg } = useOrganization();
  const { mutateAsync: addAwsExternalKms } = useAddExternalKms(currentOrg?.id!);
  const { mutateAsync: updateAwsExternalKms } = useUpdateExternalKms(currentOrg?.id!);

  const selectedAwsAuthType = watch("provider.inputs.credential.type");

  const handleAwsKmsFormSubmit = async (data: AddExternalKmsType) => {
    const { name, description, provider } = data;
    try {
      if (kms) {
        await updateAwsExternalKms({
          kmsId: kms.id,
          name,
          description,
          provider
        });

        createNotification({
          text: "Successfully updated AWS External KMS",
          type: "success"
        });
      } else {
        await addAwsExternalKms({
          name,
          description,
          provider
        });

        createNotification({
          text: "Successfully added AWS External KMS",
          type: "success"
        });
      }

      onCompleted();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleAwsKmsFormSubmit)} autoComplete="off">
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState: { error } }) => (
          <FormControl label="Alias" errorText={error?.message} isError={Boolean(error)}>
            <Input placeholder="" {...field} />
          </FormControl>
        )}
      />
      <Controller
        control={control}
        name="description"
        render={({ field, fieldState: { error } }) => (
          <FormControl label="Description" errorText={error?.message} isError={Boolean(error)}>
            <Input placeholder="" {...field} />
          </FormControl>
        )}
      />
      <Controller
        control={control}
        name="provider.inputs.credential.type"
        defaultValue={KmsAwsCredentialType.AssumeRole}
        render={({ field: { onChange, ...field }, fieldState: { error } }) => (
          <FormControl
            label="Authentication Mode"
            errorText={error?.message}
            isError={Boolean(error)}
          >
            <Select
              defaultValue={field.value}
              {...field}
              onValueChange={(e) => {
                setValue("provider.inputs.credential.data.accessKey", "");
                setValue("provider.inputs.credential.data.secretKey", "");
                setValue("provider.inputs.credential.data.assumeRoleArn", "");
                setValue("provider.inputs.credential.data.externalId", "");

                onChange(e);
              }}
              className="w-full"
            >
              <SelectItem value={KmsAwsCredentialType.AssumeRole}>AWS Assume Role</SelectItem>
              <SelectItem value={KmsAwsCredentialType.AccessKey}>Access Key</SelectItem>
            </Select>
          </FormControl>
        )}
      />

      {selectedAwsAuthType === KmsAwsCredentialType.AccessKey ? (
        <>
          <Controller
            control={control}
            name="provider.inputs.credential.data.accessKey"
            render={({ field, fieldState: { error } }) => (
              <FormControl
                label="Access Key ID"
                errorText={error?.message}
                isError={Boolean(error)}
              >
                <Input placeholder="" {...field} />
              </FormControl>
            )}
          />
          <Controller
            control={control}
            name="provider.inputs.credential.data.secretKey"
            render={({ field, fieldState: { error } }) => (
              <FormControl
                label="Secret Access Key"
                errorText={error?.message}
                isError={Boolean(error)}
              >
                <Input type="password" autoComplete="new-password" placeholder="" {...field} />
              </FormControl>
            )}
          />
        </>
      ) : (
        <>
          <Controller
            control={control}
            name="provider.inputs.credential.data.assumeRoleArn"
            render={({ field, fieldState: { error } }) => (
              <FormControl
                label="IAM Role ARN For Role Assumption"
                errorText={error?.message}
                isError={Boolean(error)}
              >
                <Input placeholder="" {...field} />
              </FormControl>
            )}
          />
          <Controller
            control={control}
            name="provider.inputs.credential.data.externalId"
            render={({ field, fieldState: { error } }) => (
              <FormControl
                label="Assume Role External ID"
                errorText={error?.message}
                isError={Boolean(error)}
              >
                <Input placeholder="" {...field} />
              </FormControl>
            )}
          />
        </>
      )}
      <Controller
        control={control}
        name="provider.inputs.awsRegion"
        render={({ field: { onChange, ...field }, fieldState: { error } }) => (
          <FormControl label="AWS Region" errorText={error?.message} isError={Boolean(error)}>
            <Select
              defaultValue={field.value}
              {...field}
              onValueChange={(e) => onChange(e)}
              className="w-full border border-mineshaft-500"
            >
              {AWS_REGIONS.map((awsRegion) => (
                <SelectItem value={awsRegion.slug} key={`kms-aws-region-${awsRegion.slug}`}>
                  {awsRegion.name} <Badge variant="success">{awsRegion.slug}</Badge>
                </SelectItem>
              ))}
            </Select>
          </FormControl>
        )}
      />
      <Controller
        control={control}
        name="provider.inputs.kmsKeyId"
        render={({ field, fieldState: { error } }) => (
          <FormControl label="AWS KMS Key ID" errorText={error?.message} isError={Boolean(error)}>
            <Input placeholder="" {...field} />
          </FormControl>
        )}
      />
      <div className="mt-6 flex items-center space-x-4">
        <Button type="submit" isLoading={isSubmitting}>
          Save
        </Button>
        <Button variant="outline_bg" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};
