import { BigInt, Bytes } from "@graphprotocol/graph-ts";

import { Proposal } from "../../generated/schema";

export function getProposal(
  id: string,
  optionalArg: BigInt = BigInt.zero()
): Proposal {
  if (entityExists(id)) {
    const entity = Proposal.load(id);
    return changetype<Proposal>(entity);
  } else {
    throw new Error("Proposal doesn't exist");
  }
}

export function createProposal(id: string, arg: BigInt): Proposal {
  let entity: Proposal;

  if (!entityExists(id)) {
    entity = new Proposal(id);

    entity.remark = "";
    entity.situation = "";
    entity.callData = Bytes.empty();
    entity.target = "";
    entity.proposer = Bytes.empty();
    entity.executed = false;

    return entity;
  } else {
    throw new Error("Proposal already exists");
  }
}

export function getOrCreateProposal(
  id: string,
  optionalArg: BigInt = BigInt.zero()
): Proposal {
  if (entityExists(id)) {
    return changetype<Proposal>(Proposal.load(id));
  } else {
    return createProposal(id, optionalArg);
  }
}

export function entityExists(id: string): bool {
  return Proposal.load(id) != null;
}
