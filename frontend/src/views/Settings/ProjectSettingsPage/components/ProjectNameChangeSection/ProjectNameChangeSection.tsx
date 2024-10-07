import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

import { createNotification } from "@app/components/notifications";
import { ProjectPermissionCan } from "@app/components/permissions";
import { Button, FormControl, Input } from "@app/components/v2";
import { ProjectPermissionActions, ProjectPermissionSub, useWorkspace } from "@app/context";
import { useUpdateProject } from "@app/hooks/api";

import { CopyButton } from "./CopyButton";

/* TODO: uncomment project default role UI additions once it has application */

const formSchema = yup.object({
  name: yup
    .string()
    .required()
    .label("Project Name")
    .max(64, "Too long, maximum length is 64 characters")
  // defaultMembershipRoleSlug: yup.string().required().label("Default Membership Role")
});

type FormData = yup.InferType<typeof formSchema>;

// export const isCustomProjectRole = (slug: string) =>
//   !Object.values(ProjectMembershipRole).includes(slug as ProjectMembershipRole);

export const ProjectNameChangeSection = () => {
  const { currentWorkspace } = useWorkspace();
  const { mutateAsync, isLoading } = useUpdateProject();

  // const { permission } = useProjectPermission();
  // const canReadProjectRoles = permission.can(
  //   ProjectPermissionActions.Read,
  //   ProjectPermissionSub.Role
  // );

  // const { data: roles, isLoading: isRolesLoading } = useGetProjectRoles(
  //   currentWorkspace?.slug!,
  //   canReadProjectRoles
  // );

  const { handleSubmit, control, reset } = useForm<FormData>({ resolver: yupResolver(formSchema) });
  // const [isFormInitialized, setIsFormInitialized] = useState(false);

  useEffect(() => {
    if (currentWorkspace) {
      reset({
        name: currentWorkspace.name
        // ...(canReadProjectRoles &&
        //   roles?.length && {
        //     // will always be present, can't remove role if default
        //     defaultMembershipRoleSlug: isCustomProjectRole(currentWorkspace.defaultMembershipRole)
        //       ? roles?.find((role) => currentWorkspace.defaultMembershipRole === role.id)?.slug!
        //       : currentWorkspace.defaultMembershipRole
        //   })
      });
      // setIsFormInitialized(true);
    }
  }, [
    currentWorkspace
    // roles
  ]);

  const onFormSubmit = async ({
    name
  }: // defaultMembershipRoleSlug
  FormData) => {
    try {
      if (!currentWorkspace?.id) return;

      await mutateAsync({
        slug: currentWorkspace.slug,
        name
        // defaultMembershipRoleSlug
      });

      createNotification({
        text: "Successfully renamed workspace",
        type: "success"
      });
    } catch (err) {
      console.error(err);
      createNotification({
        text: "Failed to rename workspace",
        type: "error"
      });
    }
  };

  // if (!isFormInitialized) {
  //   return (
  //     <div className="flex h-[25.25rem] w-full items-center justify-center">
  //       <Spinner size="lg" />
  //     </div>
  //   );
  // }

  return (
    <form
      onSubmit={handleSubmit(onFormSubmit)}
      className="mb-6 rounded-lg border border-mineshaft-600 bg-mineshaft-900 p-4"
    >
      <div className="justify-betweens flex">
        <h2 className="mb-8 flex-1 text-xl font-semibold text-mineshaft-100">Project Name</h2>
        <div className="space-x-2">
          <CopyButton
            value={currentWorkspace?.slug || ""}
            hoverText="Click to project slug"
            notificationText="Copied project slug to clipboard"
          >
            Copy Project Slug
          </CopyButton>
          <CopyButton
            value={currentWorkspace?.id || ""}
            hoverText="Click to project ID"
            notificationText="Copied project ID to clipboard"
          >
            Copy Project ID
          </CopyButton>
        </div>
      </div>
      <div className="max-w-md">
        <ProjectPermissionCan I={ProjectPermissionActions.Edit} a={ProjectPermissionSub.Workspace}>
          {(isAllowed) => (
            <Controller
              defaultValue=""
              render={({ field, fieldState: { error } }) => (
                <FormControl isError={Boolean(error)} errorText={error?.message}>
                  <Input
                    placeholder="Project name"
                    {...field}
                    className="bg-mineshaft-800"
                    isDisabled={!isAllowed}
                  />
                </FormControl>
              )}
              control={control}
              name="name"
            />
          )}
        </ProjectPermissionCan>
      </div>
      {/*
      {canReadProjectRoles && (
        <div className="pb-4">
          <h2 className="text-md mb-2 text-mineshaft-100">Default Project Member Role</h2>
          <ProjectPermissionCan
            I={ProjectPermissionActions.Edit}
            a={ProjectPermissionSub.Workspace}
          >
            {(isAllowed) => (
              <Controller
                defaultValue=""
                control={control}
                name="defaultMembershipRoleSlug"
                render={({ field: { value, onChange }, fieldState: { error } }) => (
                  <FormControl
                    helperText="Users joining this project will be assigned this role unless otherwise specified"
                    isError={Boolean(error)}
                    errorText={error?.message}
                    className="max-w-md"
                  >
                    <Select
                      isDisabled={isRolesLoading || !isAllowed}
                      className="w-full capitalize"
                      value={value}
                      onValueChange={onChange}
                    >
                      {roles?.map((role) => {
                        return (
                          <SelectItem key={role.id} value={role.slug}>
                            {role.name}
                          </SelectItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                )}
              />
            )}
          </ProjectPermissionCan>
        </div>
      )}
*/}
      <ProjectPermissionCan I={ProjectPermissionActions.Edit} a={ProjectPermissionSub.Workspace}>
        {(isAllowed) => (
          <Button
            colorSchema="secondary"
            type="submit"
            isLoading={isLoading}
            isDisabled={isLoading || !isAllowed}
          >
            Save
          </Button>
        )}
      </ProjectPermissionCan>
    </form>
  );
};
