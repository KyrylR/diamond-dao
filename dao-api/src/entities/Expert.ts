import { BigInt, Bytes } from "@graphprotocol/graph-ts";

import { Expert } from "../../generated/schema";

export function getExpert(
  id: Bytes,
  optionalArg: BigInt = BigInt.zero()
): Expert {
  if (entityExists(id)) {
    const entity = Expert.load(id);
    return changetype<Expert>(entity);
  } else {
    throw new Error("Expert doesn't exist");
  }
}

export function createExpert(id: Bytes, arg: BigInt): Expert {
  let entity: Expert;

  if (!entityExists(id)) {
    entity = new Expert(id);

    entity.group = "";
    entity.startBlocks = new Array<BigInt>();
    entity.endBlocks = new Array<BigInt>();
    entity.startTimestamps = new Array<BigInt>();
    entity.endTimestamps = new Array<BigInt>();
    entity.proposals = new Array<string>();

    return entity;
  } else {
    throw new Error("Expert already exists");
  }
}

export function getOrCreateExpert(
  id: Bytes,
  optionalArg: BigInt = BigInt.zero()
): Expert {
  if (entityExists(id)) {
    return changetype<Expert>(Expert.load(id));
  } else {
    return createExpert(id, optionalArg);
  }
}

export function entityExists(id: Bytes): bool {
  return Expert.load(id) != null;
}
