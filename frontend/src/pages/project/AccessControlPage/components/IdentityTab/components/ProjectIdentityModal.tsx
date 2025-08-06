import { Controller, useFieldArray, useForm } from "react-hook-form";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { createNotification } from "@app/components/notifications";
import {
  Button,
  FilterableSelect,
  FormControl,
  FormLabel,
  IconButton,
  Input,
  Modal,
  ModalContent,
  Switch
} from "@app/components/v2";
import { useWorkspace } from "@app/context";
import { getProjectBaseURL } from "@app/helpers/project";
import { useCreateProjectIdentity, useGetProjectRoles, useUpdateIdentity } from "@app/hooks/api";
import { useAddIdentityUniversalAuth } from "@app/hooks/api/identities";
import { Identity } from "@app/hooks/api/identities/types";

const schema = z
  .object({
    name: z.string().min(1, "Required"),
    roles: z.object({ slug: z.string(), name: z.string() }).array(),
    hasDeleteProtection: z.boolean(),
    metadata: z
      .object({
        key: z.string().trim().min(1),
        value: z.string().trim().min(1)
      })
      .array()
      .default([])
      .optional()
  })
  .required();

export type FormData = z.infer<typeof schema>;

type Props = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  identity?: Identity;
};

type ContentProps = {
  identity?: Identity;
  onClose: () => void;
};

const Content = ({ identity, onClose }: ContentProps) => {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const projectId = currentWorkspace?.id || "";

  const { data: projectRoles } = useGetProjectRoles(currentWorkspace?.id || "");

  const { mutateAsync: createMutateAsync } = useCreateProjectIdentity();
  const { mutateAsync: updateMutateAsync } = useUpdateIdentity();
  const { mutateAsync: addAuthMutateAsync } = useAddIdentityUniversalAuth();

  const {
    control,
    handleSubmit,
    formState: { isSubmitting }
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      hasDeleteProtection: false
    }
  });

  const metadataFormFields = useFieldArray({
    control,
    name: "metadata"
  });

  const onFormSubmit = async ({ name, roles, metadata, hasDeleteProtection }: FormData) => {
    try {
      if (identity) {
        await updateMutateAsync({
          identityId: identity.id,
          name,
          roles: roles.map((role) => ({ role: role.slug })),
          hasDeleteProtection,
          projectId,
          metadata
        });
      } else {
        // create

        const { id: createdId } = await createMutateAsync({
          name,
          roles: roles.map((role) => ({ role: role.slug })),
          hasDeleteProtection,
          projectId,
          metadata
        });

        // await addMutateAsync({
        //   // organizationId: projectId,
        //   identityId: createdId,
        //   clientSecretTrustedIps: [{ ipAddress: "0.0.0.0/0" }, { ipAddress: "::/0" }],
        //   accessTokenTrustedIps: [{ ipAddress: "0.0.0.0/0" }, { ipAddress: "::/0" }],
        //   accessTokenTTL: 2592000,
        //   accessTokenMaxTTL: 2592000,
        //   accessTokenNumUsesLimit: 0,
        //   accessTokenPeriod: 0
        // });

        navigate({
          to: `${getProjectBaseURL(currentWorkspace.type)}/identities/$identityId`,
          params: {
            projectId,
            identityId: createdId
          }
        });
      }

      createNotification({
        text: `Successfully ${identity ? "updated" : "created"} project identity`,
        type: "success"
      });

      onClose();
    } catch (err) {
      console.error(err);
      const error = err as any;
      const text =
        error?.response?.data?.message ??
        `Failed to ${identity ? "update" : "create"} project identity`;

      createNotification({
        text,
        type: "error"
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)}>
      <Controller
        control={control}
        defaultValue=""
        name="name"
        render={({ field, fieldState: { error } }) => (
          <FormControl label="Name" isError={Boolean(error)} errorText={error?.message}>
            <Input {...field} placeholder="Machine 1" />
          </FormControl>
        )}
      />
      <Controller
        control={control}
        name="roles"
        render={({ field: { onChange, value }, fieldState: { error } }) => (
          <FormControl
            className="w-full"
            label="Select roles"
            tooltipText="Select the roles that you wish to assign to this identity"
            errorText={error?.message}
            isError={Boolean(error)}
          >
            <FilterableSelect
              options={projectRoles}
              placeholder="Select roles..."
              value={value}
              onChange={onChange}
              isMulti
              getOptionValue={(option) => option.slug}
              getOptionLabel={(option) => option.name}
            />
          </FormControl>
        )}
      />
      <Controller
        control={control}
        name="hasDeleteProtection"
        render={({ field: { onChange, value }, fieldState: { error } }) => (
          <FormControl errorText={error?.message} isError={Boolean(error)}>
            <Switch
              className="ml-0 mr-2 bg-mineshaft-400/80 shadow-inner data-[state=checked]:bg-green/80"
              containerClassName="flex-row-reverse w-fit"
              id="delete-protection-enabled"
              thumbClassName="bg-mineshaft-800"
              onCheckedChange={onChange}
              isChecked={value}
            >
              <p>Delete Protection {value ? "Enabled" : "Disabled"}</p>
            </Switch>
          </FormControl>
        )}
      />
      <div>
        <FormLabel label="Metadata" />
      </div>
      <div className="mb-3 flex flex-col space-y-2">
        {metadataFormFields.fields.map(({ id: metadataFieldId }, i) => (
          <div key={metadataFieldId} className="flex items-end space-x-2">
            <div className="flex-grow">
              {i === 0 && <span className="text-xs text-mineshaft-400">Key</span>}
              <Controller
                control={control}
                name={`metadata.${i}.key`}
                render={({ field, fieldState: { error } }) => (
                  <FormControl
                    isError={Boolean(error?.message)}
                    errorText={error?.message}
                    className="mb-0"
                  >
                    <Input {...field} />
                  </FormControl>
                )}
              />
            </div>
            <div className="flex-grow">
              {i === 0 && (
                <FormLabel label="Value" className="text-xs text-mineshaft-400" isOptional />
              )}
              <Controller
                control={control}
                name={`metadata.${i}.value`}
                render={({ field, fieldState: { error } }) => (
                  <FormControl
                    isError={Boolean(error?.message)}
                    errorText={error?.message}
                    className="mb-0"
                  >
                    <Input {...field} />
                  </FormControl>
                )}
              />
            </div>
            <IconButton
              ariaLabel="delete key"
              className="bottom-0.5 h-9"
              variant="outline_bg"
              onClick={() => metadataFormFields.remove(i)}
            >
              <FontAwesomeIcon icon={faTrash} />
            </IconButton>
          </div>
        ))}
        <div className="mt-2 flex justify-end">
          <Button
            leftIcon={<FontAwesomeIcon icon={faPlus} />}
            size="xs"
            variant="outline_bg"
            onClick={() => metadataFormFields.append({ key: "", value: "" })}
          >
            Add Key
          </Button>
        </div>
      </div>
      <div className="flex items-center">
        <Button
          className="mr-4"
          size="sm"
          type="submit"
          isLoading={isSubmitting}
          isDisabled={isSubmitting}
        >
          {identity ? "Update" : "Create"}
        </Button>
        <Button colorSchema="secondary" variant="plain" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

export const ProjectIdentityModal = ({ isOpen, onOpenChange, identity }: Props) => {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent
        bodyClassName="overflow-visible"
        title={`${identity ? "Update" : "Create"} Project Identity`}
      >
        <Content onClose={() => onOpenChange(false)} identity={identity} />
      </ModalContent>
    </Modal>
  );
};
