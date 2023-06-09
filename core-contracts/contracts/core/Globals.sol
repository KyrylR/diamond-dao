// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@dlsl/dev-modules/utils/Globals.sol";

import "../interfaces/IDAOVoting.sol";
import "../interfaces/tokens/IERC20Extended.sol";

import "../libs/ArrayHelper.sol";

address constant ETHEREUM_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

string constant MASTER_ROLE = "MASTER";

string constant CREATE_PERMISSION = "CREATE";
string constant UPDATE_PERMISSION = "UPDATE";
string constant EXECUTE_PERMISSION = "EXECUTE";
string constant DELETE_PERMISSION = "DELETE";

string constant CONFIGURE_DAO_PERMISSION = "CONFIGURE_DAO";

string constant CREATE_VOTING_PERMISSION = "CREATE_VOTING";

string constant VOTE_PERMISSION = "VOTE";
string constant VETO_PERMISSION = "VETO";
string constant VOTE_FOR_PERMISSION = "VOTE_FOR";
string constant VETO_FOR_PERMISSION = "VETO_FOR";
string constant EXPERT_PERMISSION = "EXPERT";

string constant ADD_GROUP_PERMISSION = "ADD_GROUP";
string constant UPDATE_GROUP_PERMISSION = "UPDATE_GROUP";
string constant DELETE_GROUP_PERMISSION = "DELETE_GROUP";

string constant INTEGRATION_PERMISSION = "INTEGRATION";

string constant MINT_PERMISSION = "MINT";
string constant BURN_PERMISSION = "BURN";

string constant VOTING_NAME = "VOTING";

string constant TOKEN_FACTORY_NAME = "TOKEN_FACTORY";
string constant TOKEN_REGISTRY_NAME = "TOKEN_REGISTRY";

string constant DAO_RESERVED_NAME = "DAO Token Holder";

string constant DAO_REGISTRY_NAME = "DAO_REGISTRY";
string constant DAO_PERMISSION_MANAGER_NAME = "DAO_PERMISSION_MANAGER";

string constant DAO_VAULT_NAME = "DAO_VAULT";

string constant DAO_MEMBER_STORAGE_NAME = "DAO_MEMBER_STORAGE";

// Used to get the implementation from the master DAO Registry
string constant DAO_PARAMETER_STORAGE_NAME = "DAO_PARAMETER_STORAGE";

string constant DAO_VAULT_RESOURCE = "DAO_VAULT_RESOURCE";

function getVotingKey(string memory situation_, string memory key_) pure returns (string memory) {
    return string.concat(situation_, ".", key_);
}

// Return `string[] memory` in all functions instead of `string memory`
// to avoid stack too deep error
using ArrayHelper for string[1];

function getDAOGroup(string memory daoRegistryResource_) pure returns (string[] memory) {
    return [string.concat("DAOGroup:", daoRegistryResource_)].asArray();
}

function getDAOExpertGroup(string memory panelName_) pure returns (string[] memory) {
    return [string.concat("DAOExpertVotingGroup:", panelName_)].asArray();
}

function getVetoGroup(string memory resource_) pure returns (string[] memory) {
    return [string.concat("VetoGroupFor:", resource_)].asArray();
}

function getDAOMemberRole(string memory panelName_) pure returns (string[] memory) {
    return [string.concat("DAOMemberRole:", panelName_)].asArray();
}

function getDAOExpertRole(string memory panelName_) pure returns (string[] memory) {
    return [string.concat("DAOExpertRole:", panelName_)].asArray();
}

function getVetoGroupRole(string memory resource_) pure returns (string[] memory) {
    return [string.concat("VetoGroupRoleFor:", resource_)].asArray();
}

function getDAOVotingRole(string memory panelName_) pure returns (string[] memory) {
    return [string.concat("DAOVotingRole:", panelName_)].asArray();
}

/**
 * @dev Returns the resource name for the specified DAO panel.
 * @param moduleType_ The type of the DAO module for which to get the resource name.
 * @param panelName_ The name of the panel for which to get the resource name.
 * @return The resource name for the specified DAO panel.
 */
function getDAOPanelResource(
    string memory moduleType_,
    string memory panelName_
) pure returns (string memory) {
    return string.concat(moduleType_, ":", panelName_);
}
