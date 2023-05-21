import { BigInt, Bytes } from "@graphprotocol/graph-ts";

import { Vote } from "../../generated/schema";

export function getVote(id: string, optionalArg: BigInt = BigInt.zero()): Vote {
  if (entityExists(id)) {
    const entity = Vote.load(id);
    return changetype<Vote>(entity);
  } else {
    throw new Error("Vote doesn't exist");
  }
}

export function createVote(id: string, arg: BigInt): Vote {
  let entity: Vote;

  if (!entityExists(id)) {
    entity = new Vote(id);

    entity.votingOption = "";
    entity.votingPower = BigInt.fromI32(0);

    return entity;
  } else {
    throw new Error("Vote already exists");
  }
}

export function getOrCreateVote(
  id: string,
  optionalArg: BigInt = BigInt.zero()
): Vote {
  if (entityExists(id)) {
    return changetype<Vote>(Vote.load(id));
  } else {
    return createVote(id, optionalArg);
  }
}

export function entityExists(id: string): bool {
  return Vote.load(id) != null;
}
