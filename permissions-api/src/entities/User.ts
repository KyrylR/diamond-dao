import { BigInt, Bytes } from "@graphprotocol/graph-ts";

import { User } from "../../generated/schema";
import { getOrCreateGlobal } from "./Global";

export function getUser(id: Bytes, optionalArg: BigInt = BigInt.zero()): User {
  if (entityExists(id)) {
    const entity = User.load(id);
    return changetype<User>(entity);
  } else {
    throw new Error("User doesn't exist");
  }
}

export function createUser(id: Bytes, arg: BigInt): User {
  let entity: User;

  if (!entityExists(id)) {
    entity = new User(id);

    entity.rolesCount = BigInt.zero();
    entity.roles = new Array<string>();

    const global = getOrCreateGlobal();
    global.totalUsersCount = global.totalUsersCount.plus(BigInt.fromI32(1));
    global.save();

    return entity;
  } else {
    throw new Error("User already exists");
  }
}

export function getOrCreateUser(
  id: Bytes,
  optionalArg: BigInt = BigInt.zero()
): User {
  if (entityExists(id)) {
    return changetype<User>(User.load(id));
  } else {
    return createUser(id, optionalArg);
  }
}

export function entityExists(id: Bytes): bool {
  return User.load(id) != null;
}
