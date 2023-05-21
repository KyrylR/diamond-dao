import { BigInt } from "@graphprotocol/graph-ts";

import { Global } from "../../generated/schema";

import { GLOBAL_ID } from "../helpers/constants";

export function getGlobal(): Global {
  if (entityExists()) {
    const entity = Global.load(GLOBAL_ID);
    return changetype<Global>(entity);
  } else {
    throw new Error("Global doesn't exist");
  }
}

export function createGlobal(): Global {
  let entity: Global;

  if (!entityExists()) {
    entity = new Global(GLOBAL_ID);

    entity.totalUsersCount = BigInt.zero();

    return entity;
  } else {
    throw new Error("Global already exists");
  }
}

export function getOrCreateGlobal(): Global {
  if (entityExists()) {
    return changetype<Global>(Global.load(GLOBAL_ID));
  } else {
    return createGlobal();
  }
}

export function entityExists(): bool {
  return Global.load(GLOBAL_ID) != null;
}
