import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { faPlus, faSave, faShieldHalved } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { zodResolver } from "@hookform/resolvers/zod";
import { ReactFlowProvider } from "@xyflow/react";
import { twMerge } from "tailwind-merge";

import { createNotification } from "@app/components/notifications";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Modal,
  ModalClose,
  ModalContent,
  Spinner,
  TextArea
} from "@app/components/v2";
import { ProjectPermissionSub, useWorkspace } from "@app/context";
import { useGetProjectRoleBySlug, useUpdateProjectRole } from "@app/hooks/api";
import { useGeneratePolicies } from "@app/hooks/api/workspace/mutations";
import { PermissionPolicyViewer } from "@app/pages/project/RoleDetailsBySlugPage/components/PermissionPolicyViewer";
import Typewriter from "@app/pages/project/RoleDetailsBySlugPage/components/Typewriter";

import { GeneralPermissionConditions } from "./GeneralPermissionConditions";
import { GeneralPermissionPolicies } from "./GeneralPermissionPolicies";
import { IdentityManagementPermissionConditions } from "./IdentityManagementPermissionConditions";
import { PermissionEmptyState } from "./PermissionEmptyState";
import {
  formRolePermission2API,
  isConditionalSubjects,
  PROJECT_PERMISSION_OBJECT,
  projectRoleFormSchema,
  rolePermission2Form,
  TFormSchema
} from "./ProjectRoleModifySection.utils";
import { SecretPermissionConditions } from "./SecretPermissionConditions";

type Props = {
  roleSlug: string;
  isDisabled?: boolean;
};

export const renderConditionalComponents = (
  subject: ProjectPermissionSub,
  isDisabled?: boolean
) => {
  if (subject === ProjectPermissionSub.Secrets)
    return <SecretPermissionConditions isDisabled={isDisabled} />;

  if (isConditionalSubjects(subject)) {
    if (subject === ProjectPermissionSub.Identity) {
      return <IdentityManagementPermissionConditions isDisabled={isDisabled} />;
    }

    return <GeneralPermissionConditions isDisabled={isDisabled} type={subject} />;
  }

  return undefined;
};

export const RolePermissionsSection = ({ roleSlug, isDisabled }: Props) => {
  const { currentWorkspace } = useWorkspace();
  const projectId = currentWorkspace?.id || "";
  const { data: role, isPending } = useGetProjectRoleBySlug(
    currentWorkspace?.id ?? "",
    roleSlug as string
  );
  const [policies, setPolicies] = useState<any | null>(null);
  const [description, setDescription] = useState<string | null>(null);

  const generatePolicies = useGeneratePolicies();

  const [prompt, setPrompt] = useState(
    "Can you generate a secrets policy for read only access for secrets excluding frontend folder directory?"
  );
  const [showCipher, setShowCipher] = useState(false);

  const form = useForm<TFormSchema>({
    values: role ? { ...role, permissions: rolePermission2Form(role.permissions) } : undefined,
    resolver: zodResolver(projectRoleFormSchema)
  });

  const {
    handleSubmit,
    formState: { isDirty, isSubmitting },
    reset
  } = form;

  const { mutateAsync: updateRole } = useUpdateProjectRole();

  const onGeneratePolicies = async () => {
    setPolicies(null);
    setDescription(null);

    try {
      const { permissions, description } = await generatePolicies.mutateAsync({
        prompt,
        projectId: currentWorkspace?.id
      });

      console.log("permissions", permissions);

      setPolicies(permissions);
      setDescription(description);
    } catch (e) {
      createNotification({
        type: "error",
        text: (e as Error).message ?? "Error generating policies"
      });
    }
  };

  const onSubmit = async (el: TFormSchema) => {
    try {
      if (!projectId || !role?.id) return;
      await updateRole({
        id: role?.id as string,
        projectId,
        ...el,
        permissions: formRolePermission2API(el.permissions)
      });
      createNotification({ type: "success", text: "Successfully updated role" });
    } catch (err) {
      console.log(err);
      createNotification({ type: "error", text: "Failed to update role" });
    }
  };

  const isCustomRole = !["admin", "member", "viewer", "no-access"].includes(role?.slug ?? "");

  const onNewPolicy = (selectedSubject: ProjectPermissionSub) => {
    const rootPolicyValue = form.getValues(`permissions.${selectedSubject}`);
    if (rootPolicyValue && isConditionalSubjects(selectedSubject)) {
      form.setValue(
        `permissions.${selectedSubject}`,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore-error akhilmhdh: this is because of ts collision with both
        [...rootPolicyValue, {}],
        { shouldDirty: true, shouldTouch: true }
      );
    } else {
      form.setValue(
        `permissions.${selectedSubject}`,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore-error akhilmhdh: this is because of ts collision with both
        [{}],
        {
          shouldDirty: true,
          shouldTouch: true
        }
      );
    }
  };

  return (
    <>
      <Modal isOpen={showCipher} onOpenChange={setShowCipher}>
        <ModalContent
          className="max-w-3xl"
          title={
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faShieldHalved} size="xl" />
              <div className="-mt-1.5">
                <div>Ask Cipher</div>
                <div className="text-xs leading-[6px] text-mineshaft-400">Security Adviser</div>
              </div>
            </div>
          }
          bodyClassName="px-3 pt-1 pb-3"
        >
          {/* eslint-disable-next-line no-nested-ternary */}
          {policies ? (
            <div>
              <ReactFlowProvider>
                <PermissionPolicyViewer subject="secrets" permissions={policies} />
              </ReactFlowProvider>
              <div className="mt-2 flex items-center gap-2">
                <Button onClick={onGeneratePolicies} isDisabled={!prompt} colorSchema="secondary">
                  Regenerate
                </Button>
                <ModalClose asChild>
                  <Button variant="plain" colorSchema="secondary">
                    Cancel
                  </Button>
                </ModalClose>
              </div>
            </div>
          ) : generatePolicies.isPending ? (
            <div className="flex w-full items-center justify-center gap-2 rounded bg-mineshaft-900 p-4 text-base">
              <Spinner className="h-9 w-9 text-mineshaft-400" />
              <Typewriter text="Certainly! Please allow me a few moments..." />
            </div>
          ) : (
            <>
              <TextArea
                value={prompt}
                onChange={(e) => setPrompt(e.currentTarget.value)}
                className="mb-0 min-h-[10rem] !resize-none font-inter"
                placeholder="Ask Cipher a security question..."
              />
              <div className="mt-2 flex items-center gap-2">
                <Button onClick={onGeneratePolicies} isDisabled={!prompt} colorSchema="secondary">
                  Ask
                </Button>
                <ModalClose asChild>
                  <Button variant="plain" colorSchema="secondary">
                    Cancel
                  </Button>
                </ModalClose>
              </div>
            </>
          )}
        </ModalContent>
      </Modal>
      <button
        onClick={() => setShowCipher(true)}
        type="button"
        className="fixed bottom-8 right-8 z-50 rounded border border-mineshaft-400/70 bg-mineshaft-600 p-2 text-left font-inter text-sm opacity-50 transition-all duration-200 hover:opacity-100 active:scale-90"
      >
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faShieldHalved} size="xl" />
          <div className="-mt-0.5">
            <div>Ask Cipher</div>
            <div className="text-xs leading-[8px] text-mineshaft-400">Security Adviser</div>
          </div>
        </div>
      </button>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full rounded-lg border border-mineshaft-600 bg-mineshaft-900 p-4"
      >
        <FormProvider {...form}>
          <div className="flex items-center justify-between border-b border-mineshaft-400 pb-4">
            <h3 className="text-lg font-semibold text-mineshaft-100">Policies</h3>
            <div className="flex items-center space-x-4">
              {isCustomRole && (
                <>
                  {isDirty && (
                    <Button
                      className="mr-4 text-mineshaft-300"
                      variant="link"
                      isDisabled={isSubmitting}
                      isLoading={isSubmitting}
                      onClick={() => reset()}
                    >
                      Discard
                    </Button>
                  )}
                  <div className="flex items-center">
                    <Button
                      variant="outline_bg"
                      type="submit"
                      className={twMerge("h-10 rounded-r-none", isDirty && "bg-primary text-black")}
                      isDisabled={isSubmitting || !isDirty}
                      isLoading={isSubmitting}
                      leftIcon={<FontAwesomeIcon icon={faSave} />}
                    >
                      Save
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button
                          isDisabled={isDisabled}
                          className="h-10 rounded-l-none"
                          variant="outline_bg"
                          leftIcon={<FontAwesomeIcon icon={faPlus} />}
                        >
                          New policy
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="thin-scrollbar max-h-96" align="end">
                        {Object.keys(PROJECT_PERMISSION_OBJECT)
                          .sort((a, b) =>
                            PROJECT_PERMISSION_OBJECT[
                              a as keyof typeof PROJECT_PERMISSION_OBJECT
                            ].title
                              .toLowerCase()
                              .localeCompare(
                                PROJECT_PERMISSION_OBJECT[
                                  b as keyof typeof PROJECT_PERMISSION_OBJECT
                                ].title.toLowerCase()
                              )
                          )
                          .map((subject) => (
                            <DropdownMenuItem
                              key={`permission-create-${subject}`}
                              className="py-3"
                              onClick={() => onNewPolicy(subject as ProjectPermissionSub)}
                            >
                              {PROJECT_PERMISSION_OBJECT[subject as ProjectPermissionSub].title}
                            </DropdownMenuItem>
                          ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="py-4">
            {!isPending && <PermissionEmptyState />}
            {(Object.keys(PROJECT_PERMISSION_OBJECT) as ProjectPermissionSub[]).map((subject) => (
              <GeneralPermissionPolicies
                subject={subject}
                actions={PROJECT_PERMISSION_OBJECT[subject].actions}
                title={PROJECT_PERMISSION_OBJECT[subject].title}
                key={`project-permission-${subject}`}
                isDisabled={isDisabled}
              >
                {renderConditionalComponents(subject, isDisabled)}
              </GeneralPermissionPolicies>
            ))}
          </div>
        </FormProvider>
      </form>
    </>
  );
};
