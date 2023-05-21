import { Deployer, Logger } from "@dlsl/hardhat-migrate";
import { artifacts } from "hardhat";
import {
  DefaultERC20Params,
  DefaultERC721Params,
  DefaultSBTParams,
  ERC20_NAME,
  ERC721_NAME,
  SBT_NAME,
} from "@/test/utils/constants";

const SBT = artifacts.require("SBT");
const ERC20Extended = artifacts.require("ERC20Extended");
const ERC721Extended = artifacts.require("ERC721Extended");

export = async (deployer: Deployer, logger: Logger) => {
  const erc20 = await deployer.deploy(ERC20Extended);
  logger.logTransaction(await erc20.__ERC20_init(DefaultERC20Params, ERC20_NAME), "Initialize ERC20Extended");

  const erc721 = await deployer.deploy(ERC721Extended);
  logger.logTransaction(await erc721.__ERC721_init(DefaultERC721Params, ERC721_NAME), "Initialize ERC721Extended");

  const sbt = await deployer.deploy(SBT);
  logger.logTransaction(await sbt.__SBT_init(DefaultSBTParams, SBT_NAME), "Initialize SBT");

  logger.logContracts(["SBT", sbt.address], ["ERC20", erc20.address], ["ERC721", erc721.address]);
};
