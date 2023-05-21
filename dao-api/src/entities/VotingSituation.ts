import { BigInt } from "@graphprotocol/graph-ts";

import { VotingSituation } from "../../generated/schema";

export function getVotingSituation(
  id: string,
  optionalArg: BigInt = BigInt.zero()
): VotingSituation {
  if (entityExists(id)) {
    const entity = VotingSituation.load(id);
    return changetype<VotingSituation>(entity);
  } else {
    throw new Error("VotingSituation doesn't exist");
  }
}

export function createVotingSituation(
  id: string,
  arg: BigInt
): VotingSituation {
  let entity: VotingSituation;

  if (!entityExists(id)) {
    entity = new VotingSituation(id);

    entity.votingPeriod = BigInt.fromI32(0);
    entity.vetoPeriod = BigInt.fromI32(0);
    entity.proposalExecutionPeriod = BigInt.fromI32(0);
    entity.requiredQuorum = BigInt.fromI32(0);
    entity.requiredMajority = BigInt.fromI32(0);
    entity.requiredVetoQuorum = BigInt.fromI32(0);
    entity.votingType = BigInt.fromI32(0);
    entity.votingTarget = "";
    entity.votingMinAmount = BigInt.fromI32(0);

    return entity;
  } else {
    throw new Error("VotingSituation already exists");
  }
}

export function getOrCreateVotingSituation(
  id: string,
  optionalArg: BigInt = BigInt.zero()
): VotingSituation {
  if (entityExists(id)) {
    return changetype<VotingSituation>(VotingSituation.load(id));
  } else {
    return createVotingSituation(id, optionalArg);
  }
}

export function entityExists(id: string): bool {
  return VotingSituation.load(id) != null;
}
