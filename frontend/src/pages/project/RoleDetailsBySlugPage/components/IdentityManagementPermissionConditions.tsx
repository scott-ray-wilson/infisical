import { ProjectPermissionSub } from "@app/context/ProjectPermissionContext/types";

import { ConditionsFields } from "./ConditionsFields";

type Props = {
  position?: number;
  isDisabled?: boolean;
};

export const IdentityManagementPermissionConditions = ({ position = 0, isDisabled }: Props) => {
  return (
    <ConditionsFields
      isDisabled={isDisabled}
      subject={ProjectPermissionSub.Identity}
      position={position}
      selectOptions={[{ value: "identityId", label: "Identity ID" }]}
    />
  );

  // return (
  //   <ConditionsFields
  //     conditionErrorMessage={conditionErrorMessage}
  //     isDisabled={isDisabled}
  //     items={items}
  //   >
  //     {Boolean(items.fields.length) &&
  //       items.fields.map((el, index) => {
  //         const condition =
  //           (watch(`permissions.${permissionSubject}.${position}.conditions.${index}`) as {
  //             lhs: string;
  //             rhs: string;
  //             operator: string;
  //           }) || {};
  //         return (
  //           <div
  //             key={el.id}
  //             className="flex gap-2 bg-mineshaft-800 first:rounded-t-md last:rounded-b-md"
  //           >
  //             <div className="w-1/4">
  //               <Controller
  //                 control={control}
  //                 name={`permissions.${permissionSubject}.${position}.conditions.${index}.lhs`}
  //                 render={({ field, fieldState: { error } }) => (
  //                   <FormControl
  //                     isError={Boolean(error?.message)}
  //                     errorText={error?.message}
  //                     className="mb-0"
  //                   >
  //                     <Select
  //                       defaultValue={field.value}
  //                       {...field}
  //                       onValueChange={(e) => field.onChange(e)}
  //                       className="w-full"
  //                     >
  //                       <SelectItem value=""></SelectItem>
  //                     </Select>
  //                   </FormControl>
  //                 )}
  //               />
  //             </div>
  //             <div className="flex w-36 items-center space-x-2">
  //               <Controller
  //                 control={control}
  //                 name={`permissions.${permissionSubject}.${position}.conditions.${index}.operator`}
  //                 render={({ field, fieldState: { error } }) => (
  //                   <FormControl
  //                     isError={Boolean(error?.message)}
  //                     errorText={error?.message}
  //                     className="mb-0 flex-grow"
  //                   >
  //                     <Select
  //                       defaultValue={field.value}
  //                       {...field}
  //                       onValueChange={(e) => field.onChange(e)}
  //                       className="w-full"
  //                     >
  //                       <SelectItem value={PermissionConditionOperators.$EQ}>Equal</SelectItem>
  //                       <SelectItem value={PermissionConditionOperators.$NEQ}>Not Equal</SelectItem>
  //                       <SelectItem value={PermissionConditionOperators.$IN}>In</SelectItem>
  //                     </Select>
  //                   </FormControl>
  //                 )}
  //               />
  //               <div>
  //                 <Tooltip
  //                   asChild
  //                   content={getConditionOperatorHelperInfo(
  //                     condition?.operator as PermissionConditionOperators
  //                   )}
  //                   className="max-w-xs"
  //                 >
  //                   <FontAwesomeIcon icon={faInfoCircle} size="xs" className="text-gray-400" />
  //                 </Tooltip>
  //               </div>
  //             </div>
  //             <div className="flex-grow">
  //               <Controller
  //                 control={control}
  //                 name={`permissions.${permissionSubject}.${position}.conditions.${index}.rhs`}
  //                 render={({ field, fieldState: { error } }) => (
  //                   <FormControl
  //                     isError={Boolean(error?.message)}
  //                     errorText={error?.message}
  //                     className="mb-0 flex-grow"
  //                   >
  //                     <Input {...field} />
  //                   </FormControl>
  //                 )}
  //               />
  //             </div>
  //             <div>
  //               <IconButton
  //                 ariaLabel="plus"
  //                 variant="outline_bg"
  //                 className="p-2.5"
  //                 onClick={() => items.remove(index)}
  //               >
  //                 <FontAwesomeIcon icon={faTrash} />
  //               </IconButton>
  //             </div>
  //           </div>
  //         );
  //       })}
  //   </ConditionsFields>
  // );
};
