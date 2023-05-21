import { BigInt, Bytes } from "@graphprotocol/graph-ts";

import { Parameter } from "../../generated/schema";

export function getParameter(
  id: string,
  optionalArg: BigInt = BigInt.zero()
): Parameter {
  if (entityExists(id)) {
    const entity = Parameter.load(id);
    return changetype<Parameter>(entity);
  } else {
    throw new Error("Parameter doesn't exist");
  }
}

export function createParameter(id: string, arg: BigInt): Parameter {
  let entity: Parameter;

  if (!entityExists(id)) {
    entity = new Parameter(id);

    entity.changeBlocks = new Array<BigInt>();
    entity.value = Bytes.empty();
    entity.solidityType = "";

    return entity;
  } else {
    throw new Error("Parameter already exists");
  }
}

export function getOrCreateParameter(
  id: string,
  optionalArg: BigInt = BigInt.zero()
): Parameter {
  if (entityExists(id)) {
    return changetype<Parameter>(Parameter.load(id));
  } else {
    return createParameter(id, optionalArg);
  }
}

export function entityExists(id: string): bool {
  return Parameter.load(id) != null;
}
