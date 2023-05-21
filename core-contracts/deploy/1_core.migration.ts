import { Deployer, Logger } from "@dlsl/hardhat-migrate";
import { artifacts } from "hardhat";

const DiamondDAO = artifacts.require("DiamondDAO");
const PermissionManager = artifacts.require("PermissionManager");

const DAOVault = artifacts.require("DAOVault");
const DAOVoting = artifacts.require("DAOVoting");
const DAOParameterStorage = artifacts.require("DAOParameterStorage");
const DAOMemberStorage = artifacts.require("DAOMemberStorage");

export = async (deployer: Deployer, logger: Logger) => {
  const diamond = await deployer.deploy(DiamondDAO);
  let permissionManager = await deployer.deploy(PermissionManager);

  let daoVault = await deployer.deploy(DAOVault);
  let daoVoting = await deployer.deploy(DAOVoting);
  let daoParameterStorage = await deployer.deploy(DAOParameterStorage);
  let daoMemberStorage = await deployer.deploy(DAOMemberStorage);

  logger.logContracts(
    ["DiamondDAO", diamond.address],
    ["PermissionManager", permissionManager.address],
    ["DAOVault", daoVault.address],
    ["DAOVoting", daoVoting.address],
    ["DAOParameterStorage", daoParameterStorage.address],
    ["DAOMemberStorage", daoMemberStorage.address]
  );
};
