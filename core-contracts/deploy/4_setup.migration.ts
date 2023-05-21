import { Deployer, Logger } from "@dlsl/hardhat-migrate";
import { artifacts } from "hardhat";
import {
  DAO_MEMBER_STORAGE_NAME,
  DAO_PARAMETER_STORAGE_NAME,
  DAO_PERMISSION_MANAGER_NAME,
  DAO_RESERVED_NAME,
  FIFTY_PERCENTAGE,
  getDAOPanelResource,
  TEN_PERCENTAGE,
  VOTING_NAME,
} from "@/test/utils/constants";

import { accounts } from "@/scripts/utils/utils";

const DiamondDAO = artifacts.require("DiamondDAO");
const PermissionManager = artifacts.require("PermissionManager");

const DAOVault = artifacts.require("DAOVault");
const DAOVoting = artifacts.require("DAOVoting");
const DAOParameterStorage = artifacts.require("DAOParameterStorage");
const DAOMemberStorage = artifacts.require("DAOMemberStorage");

const ERC20Extended = artifacts.require("ERC20Extended");

export = async (deployer: Deployer, logger: Logger) => {
  const deployerAccount = await accounts(0);

  let diamond = await DiamondDAO.at((await DiamondDAO.deployed()).address);

  let erc20 = await ERC20Extended.at((await ERC20Extended.deployed()).address);

  const daoVault = await DAOVault.at(diamond.address);
  const permissionManager = await PermissionManager.at(diamond.address);
  const daoMemberStorage = await DAOMemberStorage.at(diamond.address);
  const daoParameterStorage = await DAOParameterStorage.at(diamond.address);
  const daoVoting = await DAOVoting.at(diamond.address);

  const managerResource = getDAOPanelResource(DAO_PERMISSION_MANAGER_NAME, DAO_RESERVED_NAME);
  const votingResource = getDAOPanelResource(VOTING_NAME, DAO_RESERVED_NAME);
  const memberStorageResource = getDAOPanelResource(DAO_MEMBER_STORAGE_NAME, DAO_RESERVED_NAME);
  const parameterStorageResource = getDAOPanelResource(DAO_PARAMETER_STORAGE_NAME, DAO_RESERVED_NAME);

  await daoVoting.__DAOVoting_init(DAO_RESERVED_NAME, erc20.address, votingResource);
  await permissionManager.__PermissionManager_init(deployerAccount.address, managerResource, DAO_RESERVED_NAME);
  await daoMemberStorage.__DAOMemberStorage_init(DAO_RESERVED_NAME, memberStorageResource);
  await daoParameterStorage.__DAOParameterStorage_init(parameterStorageResource);
  await daoVault.__DAOVault_init();

  await permissionManager.initialConfiguration(daoVoting.address, VOTING_NAME, DAO_RESERVED_NAME);

  logger.logTransaction(
    await daoVoting.createDAOVotingSituation({
      votingSituationName: "Membership voting",
      votingValues: {
        votingPeriod: 60,
        vetoPeriod: 60,
        proposalExecutionPeriod: 60,
        requiredQuorum: TEN_PERCENTAGE,
        requiredMajority: FIFTY_PERCENTAGE,
        requiredVetoQuorum: FIFTY_PERCENTAGE,
        votingType: 0,
        votingTarget: `${memberStorageResource}`,
        votingMinAmount: 100,
      },
    }),
    "Create Membership Voting situation"
  );

  logger.logTransaction(
    await daoVoting.createDAOVotingSituation({
      votingSituationName: "General voting",
      votingValues: {
        votingPeriod: 60,
        vetoPeriod: 60,
        proposalExecutionPeriod: 60,
        requiredQuorum: TEN_PERCENTAGE,
        requiredMajority: FIFTY_PERCENTAGE,
        requiredVetoQuorum: FIFTY_PERCENTAGE,
        votingType: 0,
        votingTarget: `${votingResource}`,
        votingMinAmount: 100,
      },
    }),
    "Create General Voting situation"
  );
};
