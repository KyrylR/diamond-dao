export function getProposalId(
  proposalId: string,
  votingContractAddress: string
): string {
  return proposalId + "-" + votingContractAddress;
}

export function getSituationId(
  situationName: string,
  votingContractAddress: string
): string {
  return situationName + "-" + votingContractAddress;
}

export function getVoteId(userId: string, proposalId: string): string {
  return userId + "-" + proposalId;
}
