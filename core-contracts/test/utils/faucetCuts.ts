import { FaucetCut, FuncNameToSignature } from "@/test/utils/types";

export const DAOMemberStorageFuncSigs: FuncNameToSignature = {
  "__DAOMemberStorage_init(string,string)": "0x70d3e03f",
  "addMember(address)": "0xca6d56dc",
  "addMembers(address[])": "0x6f4d469b",
  "removeMember(address)": "0x0b1ca49a",
  "removeMembers(address[])": "0x46ee84b0",
  "isMember(address)": "0xa230c524",
  "getMembers()": "0x9eab5253",
  "getMembersCount()": "0x09772f8f",
  "getGroup()": "0x4b79c074",
};

export const PermissionManagerFuncSigs: FuncNameToSignature = {
  "__PermissionManager_init(address,string,string)": "0xb4d5d870",
  "confExternalModule(address)": "0xfd2f3267",
  "confVotingModule(string,address,string)": "0xfc2b0dd1",
  "confMemberGroup(string,string)": "0x1a990631",
  "confExpertsGroups(string,string)": "0x1f6f16a6",
  "initialConfiguration(address,string,string)": "0x60329c7b",
  "addVetoGroups(VetoGroup[])": "0x8b05be0d",
  "addVetoGroup(string,string,DAOMemberStorage)": "0xd1fc3e19",
  "removeVetoGroup(string)": "0xb36ecbc0",
  "linkStorageToVetoGroup(string,DAOMemberStorage)": "0xd86359e4",
  "getPermissionManagerStorage()": "0x785a095b",
  "getVetoGroupMembers(string)": "0xe606d254",
  "getVetoMembersCount(string)": "0x35e2d702",
  "getVetoGroupInfo(string)": "0x3778ac22",
  "isVetoGroupExists(string)": "0xbadcb35e",
  "getExistingVetoGroupTargets()": "0x81c5492b",
  "grantRoles(address,string[])": "0xee2f6ce5",
  "revokeRoles(address,string[])": "0x4f0d84e3",
  "addPermissionsToRole(string,ResourceWithPermissions[],bool)": "0x37ff630d",
  "removePermissionsFromRole(string,ResourceWithPermissions[],bool)": "0xe484116c", // Not correct
  "getUserRoles(address)": "0x06a36aee",
  "getRolePermissions(string)": "0x002f5bc0",
  "hasPermission(address,string,string)": "0x7951c6da",
  "addUserToGroups(address,string[])": "0xfcddfd4a",
  "removeUserFromGroups(address,string[])": "0x9a9aa8d4",
  "grantGroupRoles(string,string[])": "0xf1c7d41b",
  "revokeGroupRoles(string,string[])": "0x30cae168",
  "getUserGroups(address)": "0x3da04e4a",
  "getGroupRoles(string)": "0x8e5cc2b7",
};

export const DAOParameterStorageFuncSigs: FuncNameToSignature = {
  "__DAOParameterStorage_init(string)": "0x2b1c312e",
  "setDAOParameter(Parameter)": "0xcabc429d",
  "setDAOParameters(Parameter[])": "0x7760fe67",
  "removeDAOParameter(string)": "0x14529092",
  "removeDAOParameters(string[])": "0xfcae0a44",
  "getDAOParameter(string)": "0x9646b1ac",
  "getDAOParameters()": "0xd9092585",
};

export const DAOVaultFuncSigs: FuncNameToSignature = {
  "receive()": "0x00000000",
  "__DAOVault_init()": "0x14eae704",
  "depositNative()": "0xdb6b5246",
  "depositERC20(address,uint256)": "0x97feb926",
  "depositNFT(address,uint256)": "0x9b5b9b18",
  "authorizeBySBT(address)": "0x65ed3619",
  "lock(address,address,uint256,uint256)": "0x4b86c225",
  "withdrawNative(uint256)": "0x84276d81",
  "withdrawERC20(address,uint256)": "0xa1db9782",
  "withdrawNFT(address,uint256)": "0x6088e93a",
  "revokeSBTAuthorization(address)": "0xc615f5ff",
  "getVaultStorage()": "0xb9008f01",
  "getTokenSupply(address)": "0xf2866c78",
  "getUserVotingPower(address,address)": "0x5f10bb5a",
  "getUserTokens(address)": "0x519dc8d2",
  "getTimeLockInfo(address,address)": "0x3291bc00",
  "getUserNFTs(address,address)": "0x155ad9da",
  "isAuthorizedBySBT(address,address)": "0x1b465d85",
  "isSupportedNFT(address)": "0xd62f0f05",
  "isSupportedSBT(address)": "0x8a729d57",
  "getUserTokenBalance(address,address)": "0x73f8fd4b",
  "getTokenBalance(address)": "0x3aecd0e3",
};

export const DAOVotingFuncSigs: FuncNameToSignature = {
  "changeVotingToken(address)": "0x54dfc2ed",
  "getVotingToken()": "0xe28c3b19",
  "getDAOVotingStorage()": "0x07e658c7",
  "getProposal(uint256)": "0xc7f758a8",
  "getProposalList(uint256,uint256)": "0x73708b1b",
  "getProposalStatus(uint256)": "0x401853b7",
  "getProposalVotingStats(uint256)": "0x77f8e93b",
  "getVotingSituations()": "0x75706ff2",
  "getVotingSituationInfo(string)": "0xd047d877",
  "removeVotingSituation(string)": "0x71834626",
  "__DAOVoting_init(string,address,string)": "0xc345460b",
  "createDAOVotingSituation(IDAOVoting.InitialSituation)": "0x3885bfeb",
  "createProposal(string,string,bytes)": "0xb66bfb5f",
  "voteFor(uint256)": "0x86a50535",
  "voteAgainst(uint256)": "0x750e443a",
  "veto(uint256)": "0x1d28dec7",
  "executeProposal(uint256)": "0x0d61b519",
};

export function buildFaucetCutsFromFuncSigs(
  funcSigs: FuncNameToSignature,
  facetAddress: string,
  action: number
): FaucetCut[] {
  const faucetCuts: FaucetCut[] = [];

  for (const [, /*funcName*/ funcSig] of Object.entries(funcSigs)) {
    faucetCuts.push({
      facetAddress,
      action,
      functionSelectors: [funcSig],
    });
  }

  return faucetCuts;
}
