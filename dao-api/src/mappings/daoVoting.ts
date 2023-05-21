import {
  ProposalCreated,
  ProposalExecuted,
  UserVetoed,
  UserVoted,
  VotingSituationCreated,
  VotingSituationRemoved,
  VotingTokenChanged,
} from "../../generated/DAOVoting/DAOVoting";
import { getOrCreateProposal, getProposal } from "../entities/Proposal";
import { getOrCreateVotingSituation } from "../entities/VotingSituation";
import { BigInt, log } from "@graphprotocol/graph-ts";
import { getOrCreateVotingData } from "../entities/VotingData";
import { getOrCreateUser } from "../entities/User";
import { getOrCreateVote } from "../entities/Vote";
import { getVotingOption } from "../helpers/enums";
import { getOrCreateExpert } from "../entities/Expert";
import { getProposalId, getSituationId, getVoteId } from "../helpers/getIds";

export function onVotingSituationCreated(event: VotingSituationCreated): void {
  const situation = getOrCreateVotingSituation(
    getSituationId(event.params.name.toString(), event.address.toHexString())
  );

  situation.votingPeriod = event.params.values.votingPeriod;
  situation.vetoPeriod = event.params.values.vetoPeriod;
  situation.proposalExecutionPeriod =
    event.params.values.proposalExecutionPeriod;

  situation.requiredQuorum = event.params.values.requiredQuorum;
  situation.requiredMajority = event.params.values.requiredMajority;
  situation.requiredVetoQuorum = event.params.values.requiredVetoQuorum;
  situation.votingType = event.params.values.votingType;
  situation.votingTarget = event.params.values.votingTarget;
  situation.votingMinAmount = event.params.values.votingMinAmount;

  situation.votingData = event.address;

  situation.isPresent = true;

  situation.save();
}

export function onVotingSituationRemoved(event: VotingSituationRemoved): void {
  const situation = getOrCreateVotingSituation(
    getSituationId(event.params.name.toString(), event.address.toHexString())
  );

  situation.isPresent = false;

  situation.save();
}

export function onVotingTokenChanged(event: VotingTokenChanged): void {
  const votingData = getOrCreateVotingData(event.address);

  votingData.votingToken = event.params.votingToken;

  votingData.save();
}

export function onProposalCreated(event: ProposalCreated): void {
  const proposal = getOrCreateProposal(
    getProposalId(event.params.id.toString(), event.address.toHexString())
  );

  const votingSituations = getOrCreateVotingSituation(
    getSituationId(
      event.params.proposal.relatedVotingSituation.toString(),
      event.address.toHexString()
    )
  );

  proposal.remark = event.params.proposal.remark;
  proposal.situation = votingSituations.id;
  proposal.callData = event.params.proposal.callData;
  proposal.target = event.params.proposal.target;
  proposal.proposer = event.transaction.from;
  proposal.executed = false;

  proposal.save();
}

export function onUserVoted(event: UserVoted): void {
  const user = getOrCreateUser(event.transaction.from);
  const proposal = getOrCreateProposal(
    getProposalId(event.params.id.toString(), event.address.toHexString())
  );

  const userProposals = user.proposals;
  const userVotes = user.votes;

  const vote = getOrCreateVote(
    getVoteId(user.id.toHexString(), proposal.id.toString())
  );

  vote.votingPower = event.params.votingPower;
  vote.votingOption = getVotingOption(event.params.option);

  vote.save();

  userProposals.push(proposal.id);
  userVotes.push(vote.id);

  user.proposals = userProposals;
  user.votes = userVotes;

  user.save();
}

export function onUserVetoed(event: UserVetoed): void {
  const proposal = getOrCreateProposal(
    getProposalId(event.params.id.toString(), event.address.toHexString())
  );
  const expert = getOrCreateExpert(event.params.voter);

  const expertProposals = expert.proposals;

  expertProposals.push(proposal.id);

  expert.proposals = expertProposals;

  expert.save();
}

export function onProposalExecuted(event: ProposalExecuted): void {
  const proposal = getOrCreateProposal(
    getProposalId(event.params.id.toString(), event.address.toHexString())
  );

  const user = getOrCreateUser(event.transaction.from);

  const votingData = getOrCreateVotingData(event.address);

  const userTokens = user.tokens;
  const lockedTokens = user.lockedTokens;

  const index = userTokens.indexOf(votingData.votingToken);

  if (index == -1) {
    log.error("User {} doesn't have Token {}", [
      user.id.toHexString(),
      votingData.votingToken.toHexString(),
    ]);

    return;
  }

  lockedTokens[index] = BigInt.fromI32(-1);

  user.lockedTokens = lockedTokens;

  user.save();

  proposal.executed = true;

  proposal.save();
}
