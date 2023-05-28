import { BigInt, Bytes } from "@graphprotocol/graph-ts";

import { Role } from "../../generated/schema";

export function getRole(id: string, optionalArg: BigInt = BigInt.zero()): Role {
  if (entityExists(id)) {
    const entity = Role.load(id);
    return changetype<Role>(entity);
  } else {
    throw new Error("Role doesn't exist");
  }
}

export function createRole(id: string, arg: BigInt): Role {
  let entity: Role;

  if (!entityExists(id)) {
    entity = new Role(id);

    entity.description = "";
    entity.users = new Array<Bytes>();
    entity.resources = new Array<string>();

    return entity;
  } else {
    throw new Error("Role already exists");
  }
}

export function getOrCreateRole(
  id: string,
  optionalArg: BigInt = BigInt.zero()
): Role {
  if (entityExists(id)) {
    return changetype<Role>(Role.load(id));
  } else {
    return createRole(id, optionalArg);
  }
}

export function entityExists(id: string): bool {
  return Role.load(id) != null;
}
