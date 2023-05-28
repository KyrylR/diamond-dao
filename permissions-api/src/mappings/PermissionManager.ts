import { Bytes, store } from "@graphprotocol/graph-ts";

import { extendArray, reduceArray } from "../helpers/ArrayHelper";
import { Role } from "../../generated/schema";
import {
  AddedPermissions,
  GrantedRoles,
  RemovedPermissions,
  RevokedRoles,
} from "../../generated/PermissionManager/PermissionManager";
import { getOrCreateUser } from "../entities/User";
import { getOrCreateRole } from "../entities/Role";
import { getOrCreateResource } from "../entities/Resources";

export function onGrantedRoles(event: GrantedRoles): void {
  const params = event.params;

  let user = getOrCreateUser(params.to);

  user.roles = extendArray<string>(user.roles, params.rolesToGrant);

  for (let i = 0; i < params.rolesToGrant.length; i++) {
    let role = getOrCreateRole(params.rolesToGrant[i]);

    role.users = extendArray<Bytes>(role.users, [user.id]);

    role.save();
  }

  user.save();
}

export function onRevokedRoles(event: RevokedRoles): void {
  const params = event.params;

  let user = getOrCreateUser(params.from);

  user.roles = reduceArray<string>(user.roles, params.rolesToRevoke);

  for (let i = 0; i < params.rolesToRevoke.length; i++) {
    let role = getOrCreateRole(params.rolesToRevoke[i]);

    role.users = reduceArray<Bytes>(role.users, [user.id]);

    if (role.resources.length == 0 && role.users.length == 0) {
      store.remove("Role", role.id);
    } else {
      role.save();
    }
  }

  user.save();
}

export function onAddedPermissions(event: AddedPermissions): void {
  const params = event.params;

  let resource = getOrCreateResource(params.role, params.resource);

  let role = getOrCreateRole(params.role);

  role.resources = extendArray<string>(role.resources, [resource.id]);

  role.save();

  for (let i = 0; i < params.permissionsToAdd.length; i++) {
    if (params.allowed) {
      resource.allowedPermissions = extendArray<string>(
        resource.allowedPermissions,
        [params.permissionsToAdd[i]]
      );
    } else {
      resource.disallowedPermission = extendArray<string>(
        resource.disallowedPermission,
        [params.permissionsToAdd[i]]
      );
    }
  }

  resource.save();
}

export function onRemovedPermissions(event: RemovedPermissions): void {
  const params = event.params;

  let resource = getOrCreateResource(params.role, params.resource);

  for (let i = 0; i < params.permissionsToRemove.length; i++) {
    if (params.allowed) {
      resource.allowedPermissions = reduceArray<string>(
        resource.allowedPermissions,
        [params.permissionsToRemove[i]]
      );
    } else {
      resource.disallowedPermission = reduceArray<string>(
        resource.disallowedPermission,
        [params.permissionsToRemove[i]]
      );
    }
  }

  resource.save();
}
