export const CREATE_PERMISSION = "CREATE";
export const UPDATE_PERMISSION = "UPDATE";
export const DELETE_PERMISSION = "DELETE";
export const EXECUTE_PERMISSION = "EXECUTE";
export const MINT_PERMISSION = "MINT";
export const BURN_PERMISSION = "BURN";
export const SPEND_PERMISSION = "SPEND";
export const RECEIVE_PERMISSION = "RECEIVE";
export const CHANGE_METADATA_PERMISSION = "CHANGE_METADATA";
export const CHANGE_DAO_METADATA_PERMISSION = "CHANGE_DAO_METADATA";

export const MASTER_ROLE = "MASTER";

export const TOKEN_REGISTRY_RESOURCE = "TOKEN_REGISTRY_RESOURCE";
export const TOKEN_FACTORY_RESOURCE = "TOKEN_FACTORY_RESOURCE";

export const MASTER_REGISTRY_RESOURCE = "MASTER_REGISTRY_RESOURCE";
export const MASTER_DAO_REGISTRY_RESOURCE = "MASTER_DAO_REGISTRY_RESOURCE";
export const MASTER_DAO_FACTORY_RESOURCE = "MASTER_DAO_FACTORY_RESOURCE";

export const VOTING_REGISTRY_RESOURCE = "VOTING_REGISTRY_RESOURCE";
export const VOTING_FACTORY_RESOURCE = "VOTING_FACTORY_RESOURCE";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const VOTING_NAME = "VOTING";

export const MASTER_DAO_REGISTRY_NAME = "MASTER_DAO_REGISTRY";
export const MASTER_DAO_FACTORY_NAME = "MASTER_DAO_FACTORY";

export const TOKEN_REGISTRY_NAME = "TOKEN_REGISTRY";
export const TOKEN_FACTORY_NAME = "TOKEN_FACTORY";

export const DAO_RESERVED_NAME = "DAO Token Holder";

export const DAO_REGISTRY_NAME = "DAO_REGISTRY";
export const DAO_PERMISSION_MANAGER_NAME = "DAO_PERMISSION_MANAGER";

export const DAO_VAULT_NAME = "DAO_VAULT";

export const DAO_MEMBER_STORAGE_NAME = "DAO_MEMBER_STORAGE";

// Used to get the implementation from the master DAO Registry
export const DAO_PARAMETER_STORAGE_NAME = "DAO_PARAMETER_STORAGE";

// Parameter storage for configuration parameters such as votingPeriod, vetoPeriod, etc.
export const DAO_CONF_PARAMETER_STORAGE_NAME = "DAO_CONF_PARAMETER_STORAGE";

// Parameter storage for regular experts parameters
export const DAO_REG_PARAMETER_STORAGE_NAME = "DAO_REG_PARAMETER_STORAGE";

export const DAO_VOTING_FACTORY_NAME = "DAO_VOTING_FACTORY";
export const DAO_VOTING_REGISTRY_NAME = "DAO_VOTING_REGISTRY";

export const DAO_PANEL_LIMIT_NAME = "constitution.maxPanelPerDAO";

export const ERC20_NAME = "ERC20";
export const ERC721_NAME = "ERC721";
export const SBT_NAME = "SBT";

export const DAO_VAULT_RESOURCE = "DAO_VAULT_RESOURCE";

export const CREATE_VOTING_PERMISSION = "CREATE_VOTING";
export const VOTE_PERMISSION = "VOTE";
export const VETO_PERMISSION = "VETO";

export const INTEGRATION_PERMISSION = "INTEGRATION";

export const DefaultERC20Params = {
  name: "name",
  symbol: "symbol",
  contractURI: "URI",
  decimals: 18,
  totalSupplyCap: 0,
};

export const DefaultERC721Params = {
  name: "name",
  symbol: "symbol",
  contractURI: "URI",
  baseURI: "BASE_URI",
  totalSupplyCap: 0,
};

export const DefaultSBTParams = {
  name: "name",
  symbol: "symbol",
  contractURI: "URI",
  baseURI: "BASE_URI",
  totalSupplyCap: 0,
};

export const ParameterType = {
  NONE: "0",
  ADDRESS: "1",
  UINT256: "2",
  STRING: "3",
  BYTES: "4",
  BOOL: "5",
};

export const ETHEREUM_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

export const EmptyBytes32 = "0x0000000000000000000000000000000000000000000000000000000000000000";

export const TEN_PERCENTAGE = "100000000000000000000000000";
export const FIFTY_PERCENTAGE = "500000000000000000000000000";
export const ONE_HUNDRED_PERCENTAGE = "1000000000000000000000000000";

export const DefaultDAOPanelConstructorParameters = {
  votingParams: {
    votingToken: ZERO_ADDRESS,
    panelName: "DAO Constitution",
  },
  situations: [
    {
      votingSituationName: "general",
      votingValues: {
        votingPeriod: 60,
        vetoPeriod: 60,
        proposalExecutionPeriod: 60,
        requiredQuorum: TEN_PERCENTAGE,
        requiredMajority: TEN_PERCENTAGE,
        requiredVetoQuorum: TEN_PERCENTAGE,
        votingType: 0,
        votingTarget: "",
        votingMinAmount: 10,
      },
    },
  ],
  initialMembers: [],
  initialParameters: [
    { name: "constitution.hash", value: EmptyBytes32, solidityType: ParameterType.BYTES },
    {
      name: "constitution.maxPanelPerDAO",
      value: "0x000000000000000000000000000000000000000000000000000000000000000a",
      solidityType: ParameterType.UINT256,
    },
  ],
};

export const DefaultVotingParams = DefaultDAOPanelConstructorParameters.votingParams;

export const DefaultDAOConstructorParams = {
  masterAccess: ZERO_ADDRESS,
  votingNames: [VOTING_NAME],
  votingAddresses: [],
  daoURI: "https://gdk.io",
  mainPanelParams: DefaultDAOPanelConstructorParameters,
};

export const { ethers } = require("ethers");

export function getParameter(name: any, value: any, type: any): any {
  const parameter = {
    name: name,
    value: "",
    solidityType: type,
  };

  const coder = new ethers.utils.AbiCoder();
  if (type === ParameterType.ADDRESS) {
    parameter.value = coder.encode(["address"], [value]);

    return parameter;
  } else if (type === ParameterType.UINT256) {
    parameter.value = coder.encode(["uint256"], [value]);

    return parameter;
  } else if (type === ParameterType.STRING) {
    parameter.value = coder.encode(["string"], [value]);

    return parameter;
  } else if (type === ParameterType.BYTES) {
    parameter.value = value;

    return parameter;
  } else if (type === ParameterType.BOOL) {
    parameter.value = coder.encode(["bool"], [value]);

    return parameter;
  }

  return parameter;
}

export function getDAOPanelResource(moduleType_: any, panelName_: any): string {
  return moduleType_ + ":" + panelName_;
}
