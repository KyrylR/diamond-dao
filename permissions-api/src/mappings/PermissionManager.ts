import { BigInt, Bytes, store } from "@graphprotocol/graph-ts";

import { extendArray, reduceArray } from "../helpers/ArrayHelper";
import { Role } from "../../generated/schema";
import {
  AddedPermissions,
  GrantedRoles,
  RemovedPermissions,
  RevokedRoles
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
    role.usersCount = BigInt.fromU64(role.users.length);

    role.save();
  }

  user.rolesCount = BigInt.fromU64(user.roles.length);

  user.save();
}

export function onRevokedRoles(event: RevokedRoles): void {
  const params = event.params;
  let user = getOrCreateUser(params.from);

  user.roles = reduceArray<string>(user.roles, params.rolesToRevoke);

  for (let i = 0; i < params.rolesToRevoke.length; i++) {
    let role = getOrCreateRole(params.rolesToRevoke[i]);

    role.users = reduceArray<Bytes>(role.users, [user.id]);
    role.usersCount = BigInt.fromU64(role.users.length);

    handleRole(role);
  }

  user.rolesCount = BigInt.fromU64(user.roles.length);

  user.save();
}

export function onAddedPermissions(event: AddedPermissions): void {
  const params = event.params;
  let resource = getOrCreateResource(params.role, params.resource);
  let role = getOrCreateRole(params.role);

  role.resources = extendArray<string>(role.resources, [resource.id]);
  role.resourcesCount = BigInt.fromU64(role.resourcesCount.length);

  for (let i = 0; i < params.permissionsToAdd.length; i++) {
    if (params.allowed) {
      resource.allows = extendArray<string>(resource.allows, [params.permissionsToAdd[i]]);
      resource.allowsCount = BigInt.fromU64(resource.allows.length);
    } else {
      resource.disallows = extendArray<string>(resource.disallows, [params.permissionsToAdd[i]]);
      resource.disallowsCount = BigInt.fromU64(resource.disallows.length);
    }
  }

  role.save();
  resource.save();
}

export function onRemovedPermissions(event: RemovedPermissions): void {
  const params = event.params;
  let resource = getOrCreateResource(params.role, params.resource);
  let role = getOrCreateRole(params.role);

  for (let i = 0; i < params.permissionsToRemove.length; i++) {
    if (params.allowed) {
      resource.allows = reduceArray<string>(resource.allows, [params.permissionsToRemove[i]]);
      resource.allowsCount = BigInt.fromU64(resource.allows.length);
    } else {
      resource.disallows = reduceArray<string>(resource.disallows, [params.permissionsToRemove[i]]);
      resource.disallowsCount = BigInt.fromU64(resource.disallows.length);
    }
  }

  if (resource.allowsCount.equals(BigInt.zero()) && resource.disallowsCount.equals(BigInt.zero())) {
    role.resources = reduceArray<string>(role.resources, [resource.id]);
    role.resourcesCount = BigInt.fromU64(role.resources.length);

    handleRole(role);

    store.remove("Resource", resource.id);
  } else {
    resource.save();
  }
}

function handleRole(role: Role): void {
  if (role.resources.length == 0 && role.users.length == 0) {
    store.remove("Role", role.id);
  } else {
    role.save();
  }
}
