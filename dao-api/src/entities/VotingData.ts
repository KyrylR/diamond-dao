import { BigInt, Bytes } from "@graphprotocol/graph-ts";

import { VotingData } from "../../generated/schema";

export function getVotingData(
  id: Bytes,
  optionalArg: BigInt = BigInt.zero()
): VotingData {
  if (entityExists(id)) {
    const entity = VotingData.load(id);
    return changetype<VotingData>(entity);
  } else {
    throw new Error("VotingData doesn't exist");
  }
}

export function createVotingData(id: Bytes, arg: BigInt): VotingData {
  let entity: VotingData;

  if (!entityExists(id)) {
    entity = new VotingData(id);

    entity.votingToken = Bytes.empty();

    return entity;
  } else {
    throw new Error("VotingData already exists");
  }
}

export function getOrCreateVotingData(
  id: Bytes,
  optionalArg: BigInt = BigInt.zero()
): VotingData {
  if (entityExists(id)) {
    return changetype<VotingData>(VotingData.load(id));
  } else {
    return createVotingData(id, optionalArg);
  }
}

export function entityExists(id: Bytes): bool {
  return VotingData.load(id) != null;
}
