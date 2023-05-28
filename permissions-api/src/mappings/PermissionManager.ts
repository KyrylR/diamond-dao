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
  let user = getOrCreateUser(event.params.to);

  user.roles = extendArray<string>(user.roles, event.params.rolesToGrant);

  for (let i = 0; i < event.params.rolesToGrant.length; i++) {
    let role = getOrCreateRole(event.params.rolesToGrant[i]);

    role.users = extendArray<Bytes>(role.users, [user.id]);

    role.save();
  }

  user.save();
}

export function onRevokedRoles(event: RevokedRoles): void {
  let user = getOrCreateUser(event.params.from);

  user.roles = reduceArray<string>(user.roles, event.params.rolesToRevoke);

  for (let i = 0; i < event.params.rolesToRevoke.length; i++) {
    let role = getOrCreateRole(event.params.rolesToRevoke[i]);

    role.users = reduceArray<Bytes>(role.users, [user.id]);

    if (role.resources.length == 0 && role.users.length == 0) {
      store.remove("Role", role.id);

      continue;
    }

    role.save();
  }

  user.save();
}

export function onAddedPermissions(event: AddedPermissions): void {
  let resource = getOrCreateResource(event.params.role, event.params.resource);

  let role = getOrCreateRole(event.params.role);

  role.resources = extendArray<string>(role.resources, [resource.id]);

  role.save();

  for (let i = 0; i < event.params.permissionsToAdd.length; i++) {
    if (event.params.allowed) {
      resource.allowedPermissions = extendArray<string>(
        resource.allowedPermissions,
        [event.params.permissionsToAdd[i]]
      );

      continue;
    }

    resource.disallowedPermission = extendArray<string>(
      resource.disallowedPermission,
      [event.params.permissionsToAdd[i]]
    );
  }

  resource.save();
}

export function onRemovedPermissions(event: RemovedPermissions): void {
  let resource = getOrCreateResource(event.params.role, event.params.resource);

  for (let i = 0; i < event.params.permissionsToRemove.length; i++) {
    if (event.params.allowed) {
      resource.allowedPermissions = reduceArray<string>(
        resource.allowedPermissions,
        [event.params.permissionsToRemove[i]]
      );

      continue;
    }

    resource.disallowedPermission = reduceArray<string>(
      resource.disallowedPermission,
      [event.params.permissionsToRemove[i]]
    );
  }

  resource.save();
}
