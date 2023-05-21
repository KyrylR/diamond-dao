import { Deployer, Logger } from "@dlsl/hardhat-migrate";
import { artifacts, ethers } from "hardhat";
import {
  buildFaucetCutsFromFuncSigs,
  DAOMemberStorageFuncSigs,
  DAOParameterStorageFuncSigs,
  DAOVaultFuncSigs,
  DAOVotingFuncSigs,
  PermissionManagerFuncSigs,
} from "@/test/utils/faucetCuts";

const DiamondDAO = artifacts.require("DiamondDAO");
const PermissionManager = artifacts.require("PermissionManager");

const DAOVault = artifacts.require("DAOVault");
const DAOVoting = artifacts.require("DAOVoting");
const DAOParameterStorage = artifacts.require("DAOParameterStorage");
const DAOMemberStorage = artifacts.require("DAOMemberStorage");

export = async (deployer: Deployer, logger: Logger) => {
  let diamond = await DiamondDAO.at((await DiamondDAO.deployed()).address);
  let permissionManager = await PermissionManager.at((await PermissionManager.deployed()).address);
  let daoVault = await DAOVault.at((await DAOVault.deployed()).address);
  let daoVoting = await DAOVoting.at((await DAOVoting.deployed()).address);
  let daoParameterStorage = await DAOParameterStorage.at((await DAOParameterStorage.deployed()).address);
  let daoMemberStorage = await DAOMemberStorage.at((await DAOMemberStorage.deployed()).address);

  const votingFaucetCuts = buildFaucetCutsFromFuncSigs(DAOVotingFuncSigs, daoVoting.address, 0);
  const memberStorageFaucetCuts = buildFaucetCutsFromFuncSigs(DAOMemberStorageFuncSigs, daoMemberStorage.address, 0);
  const parameterStorageFaucetCuts = buildFaucetCutsFromFuncSigs(
    DAOParameterStorageFuncSigs,
    daoParameterStorage.address,
    0
  );
  const daoVaultFaucetCuts = buildFaucetCutsFromFuncSigs(DAOVaultFuncSigs, daoVault.address, 0);
  const permissionManagerFaucetCuts = buildFaucetCutsFromFuncSigs(
    PermissionManagerFuncSigs,
    permissionManager.address,
    0
  );

  logger.logTransaction(
    await diamond.diamondCut(votingFaucetCuts, ethers.constants.AddressZero, "0x"),
    "Diamond cut DAOVoting"
  );

  logger.logTransaction(
    await diamond.diamondCut(memberStorageFaucetCuts, ethers.constants.AddressZero, "0x"),
    "Diamond cut DAOMemberStorage"
  );

  logger.logTransaction(
    await diamond.diamondCut(parameterStorageFaucetCuts, ethers.constants.AddressZero, "0x"),
    "Diamond cut DAOParameterStorage"
  );

  logger.logTransaction(
    await diamond.diamondCut(daoVaultFaucetCuts, ethers.constants.AddressZero, "0x"),
    "Diamond cut DAOVault"
  );

  logger.logTransaction(
    await diamond.diamondCut(permissionManagerFaucetCuts, ethers.constants.AddressZero, "0x"),
    "Diamond cut PermissionManager"
  );
};
