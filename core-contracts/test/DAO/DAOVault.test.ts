import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { Reverter } from "@/test/helpers/reverter";

import {
  UPDATE_PERMISSION,
  DAO_VAULT_NAME,
  ETHEREUM_ADDRESS,
  DefaultERC20Params,
  DefaultERC721Params,
  ERC20_NAME,
  ERC721_NAME,
  DAO_PERMISSION_MANAGER_NAME,
  DAO_RESERVED_NAME,
  VOTING_NAME,
  DefaultSBTParams,
} from "../utils/constants";

import { toBN, getBalance, setBalance } from "@/scripts/utils/utils";
import { getCurrentBlockTime, setTime } from "@/test/helpers/block-helper";
import { impersonate } from "@/test/helpers/impersonator";
import { castBN } from "@/test/utils/caster";

import { PermissionManager, DAOVault, ERC721Extended, ERC20Extended, SBT, IRBAC, DiamondDAO } from "@ethers-v5";
import { buildFaucetCutsFromFuncSigs, DAOVaultFuncSigs, PermissionManagerFuncSigs } from "@/test/utils/faucetCuts";

import { BigNumberish } from "ethers";

describe("DAOVault", () => {
  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let USER1: SignerWithAddress;
  let USER2: SignerWithAddress;

  let diamond: DiamondDAO;
  let manager: PermissionManager;
  let daoVault: DAOVault;
  let erc20: ERC20Extended;
  let erc721: ERC721Extended;
  let erc721_2: ERC721Extended;
  let sbt: SBT;

  const DAOVaultUpdateRole = "VUR";

  const ether: BigNumberish = toBN(10).pow(18).toString();

  before("setup", async () => {
    [OWNER, USER1, USER2] = await ethers.getSigners();

    const DiamondDAO = await ethers.getContractFactory("DiamondDAO");
    diamond = await DiamondDAO.deploy();

    const DAOVault = await ethers.getContractFactory("DAOVault");
    daoVault = await DAOVault.deploy();

    const PermissionManager = await ethers.getContractFactory("PermissionManager");
    manager = await PermissionManager.deploy();

    const ERC20 = await ethers.getContractFactory("ERC20Extended");
    erc20 = await ERC20.deploy();
    await erc20.__ERC20_init(DefaultERC20Params, ERC20_NAME);

    const ERC721 = await ethers.getContractFactory("ERC721Extended");
    erc721 = await ERC721.deploy();
    await erc721.__ERC721_init(DefaultERC721Params, ERC721_NAME);

    erc721_2 = await ERC721.deploy();
    await erc721_2.__ERC721_init(DefaultERC721Params, ERC721_NAME);

    const SBT = await ethers.getContractFactory("SBT");
    sbt = await SBT.deploy();
    await sbt.__SBT_init(DefaultSBTParams, ERC20_NAME);

    const daoVaultFaucetCuts = buildFaucetCutsFromFuncSigs(DAOVaultFuncSigs, daoVault.address, 0);
    const permissionManagerFaucetCuts = buildFaucetCutsFromFuncSigs(PermissionManagerFuncSigs, manager.address, 0);

    await diamond.diamondCut(daoVaultFaucetCuts, ethers.constants.AddressZero, "0x");
    await diamond.diamondCut(permissionManagerFaucetCuts, ethers.constants.AddressZero, "0x");

    daoVault = await DAOVault.attach(diamond.address);
    manager = await PermissionManager.attach(diamond.address);

    await manager.__PermissionManager_init(OWNER.address, DAO_PERMISSION_MANAGER_NAME, DAO_RESERVED_NAME);
    await daoVault.__DAOVault_init();

    await manager.confMemberGroup(VOTING_NAME, DAO_RESERVED_NAME);
    await manager.confExpertsGroups(VOTING_NAME, DAO_RESERVED_NAME);

    const DAOVaultUpdate: IRBAC.ResourceWithPermissionsStruct[] = [
      {
        resource: DAO_VAULT_NAME,
        permissions: [UPDATE_PERMISSION],
      },
    ];

    await manager.addPermissionsToRole(DAOVaultUpdateRole, DAOVaultUpdate, true);

    await erc20.mintTo(USER1.address, "10000000");
    await erc20.connect(USER1).approve(daoVault.address, "10000000");

    await erc721.mintTo(USER1.address, 0, "some_uri");
    await erc721.mintTo(USER1.address, 1, "some_uri");
    await erc721.connect(USER1).setApprovalForAll(daoVault.address, true);

    await erc721_2.mintTo(USER1.address, 0, "some_uri");
    await erc721_2.connect(USER1).setApprovalForAll(daoVault.address, true);

    await sbt.mintTo(OWNER.address, 0, "some_uri", 0);
    await sbt.mintTo(USER1.address, 1, "some_uri", 0);

    await reverter.snapshot();
  });

  afterEach("revert", reverter.revert);

  describe("access", () => {
    it("should initialize only once", async () => {
      await expect(daoVault.__DAOVault_init()).to.be.revertedWith("DAOVault: already initialized");
    });
  });

  describe("deposit", () => {
    it("should deposit ERC20 tokens", async () => {
      expect(await manager.getUserGroups(USER1.address)).to.be.empty;

      await daoVault.connect(USER1).depositERC20(erc20.address, 1000);
      expect(await daoVault.getUserTokenBalance(USER1.address, erc20.address)).to.equal(1000);

      expect(await manager.getUserGroups(USER1.address)).to.have.members([`DAOGroup:DAO Token Holder`]);
      expect(await daoVault.getUserVotingPower(USER1.address, erc20.address)).to.equal(
        await daoVault.getUserTokenBalance(USER1.address, erc20.address)
      );
      expect(await daoVault.getTokenSupply(erc20.address)).to.equal(10000000);
    });

    it("should be able to deposit Native tokens", async () => {
      expect(await daoVault.connect(USER1).depositNative({ value: ether }))
        .to.emit(daoVault, "Deposited")
        .withArgs(USER1.address, ether);

      expect(await daoVault.getUserTokenBalance(USER1.address, ETHEREUM_ADDRESS)).to.equal(ether);
      expect(await manager.getUserGroups(USER1.address)).to.have.members([`DAOGroup:DAO Token Holder`]);
      expect(await daoVault.getUserVotingPower(USER1.address, ETHEREUM_ADDRESS)).to.equal(
        await daoVault.getUserTokenBalance(USER1.address, ETHEREUM_ADDRESS)
      );
    });

    it("should deposit ERC721 tokens", async () => {
      await daoVault.connect(USER1).depositNFT(erc721.address, 0);

      expect(await daoVault.getUserVotingPower(USER1.address, erc721.address)).to.equal(1);

      expect(await manager.getUserGroups(USER1.address)).to.have.members([`DAOGroup:DAO Token Holder`]);

      await expect(daoVault.connect(USER1).depositNFT(erc20.address, 0)).to.be.revertedWith(
        "DAOVault: The token does not supported."
      );
    });

    it("should be able authorize with SBT", async () => {
      expect(await daoVault.getUserVotingPower(USER1.address, sbt.address)).to.equal(1);
      expect(await daoVault.getUserVotingPower(USER2.address, sbt.address)).to.equal(0);

      await daoVault.connect(USER1).authorizeBySBT(sbt.address);

      await expect(daoVault.connect(USER2).authorizeBySBT(sbt.address)).to.be.revertedWith(
        "DAOVault: The user is not authorized or token does not supported."
      );

      expect(await daoVault.getUserVotingPower(USER1.address, sbt.address)).to.equal(1);

      expect(await manager.getUserGroups(USER1.address)).to.have.members([`DAOGroup:DAO Token Holder`]);
    });
  });

  describe("lock", () => {
    it("should lock ERC20 tokens", async () => {
      await expect(daoVault.lock(USER1.address, erc20.address, 1000, 1000)).to.be.revertedWith(
        "DAOVault: Not enough tokens to lock."
      );

      await expect(daoVault.connect(USER1).lock(USER1.address, erc20.address, 1000, 1000)).to.be.revertedWith(
        "DAOVault: The sender is not allowed to perform the action, access denied."
      );

      await daoVault.connect(USER1).depositERC20(erc20.address, 1000);

      let result = await daoVault.getTimeLockInfo(USER1.address, erc20.address);
      expect(result.withdrawalAmount).to.equal(1000);
      expect(result.lockedAmount).to.equal(0);
      expect(result.unlockTime).to.equal(0);

      expect(await daoVault.getUserTokenBalance(USER1.address, erc20.address)).to.equal(1000);

      const lockTime = Number(await getCurrentBlockTime()) + 1000;
      await daoVault.lock(USER1.address, erc20.address, 1000, lockTime);

      expect(await daoVault.getUserTokenBalance(USER1.address, erc20.address)).to.equal(1000);

      result = await daoVault.getTimeLockInfo(USER1.address, erc20.address);
      expect(result.withdrawalAmount).to.equal(0);
      expect(result.lockedAmount).to.equal(1000);
      expect(result.unlockTime).to.equal(lockTime);

      await daoVault.connect(USER1).depositERC20(erc20.address, 100);

      result = await daoVault.getTimeLockInfo(USER1.address, erc20.address);
      expect(result.withdrawalAmount).to.equal(100);
      expect(result.lockedAmount).to.equal(1000);
      expect(result.unlockTime).to.equal(lockTime);

      await setTime(lockTime + 1);

      result = await daoVault.getTimeLockInfo(USER1.address, erc20.address);
      expect(result.withdrawalAmount).to.equal(1100);
      expect(result.lockedAmount).to.equal(0);
      expect(result.unlockTime).to.equal(0);

      const newLockTime = Number(await getCurrentBlockTime()) + 1000;
      await daoVault.lock(USER1.address, erc20.address, 200, newLockTime);
      result = await daoVault.getTimeLockInfo(USER1.address, erc20.address);
      expect(result.withdrawalAmount).to.equal(900);
      expect(result.lockedAmount).to.equal(200);
      expect(result.unlockTime).to.equal(newLockTime);

      await daoVault.lock(USER1.address, erc20.address, 800, newLockTime + 10);
      result = await daoVault.getTimeLockInfo(USER1.address, erc20.address);
      expect(result.withdrawalAmount).to.equal(300);
      expect(result.lockedAmount).to.equal(800);
      expect(result.unlockTime).to.equal(newLockTime + 10);
    });

    it("should not lock ERC20 for too big period", async () => {
      await daoVault.connect(USER1).depositERC20(erc20.address, 1000);
      const oneYearLater = Number(await getCurrentBlockTime()) + 365 * 24 * 60 * 60 + 10;

      await expect(daoVault.lock(USER1.address, erc20.address, 1000, oneYearLater)).to.be.revertedWith(
        "DAOVault: The lock time is too big."
      );
    });

    it("should lock Native tokens", async () => {
      await daoVault.connect(USER1).depositNative({ value: 1000 });
      await daoVault.lock(USER1.address, ETHEREUM_ADDRESS, 1000, 1000);

      expect(await daoVault.getUserTokenBalance(USER1.address, ETHEREUM_ADDRESS)).to.equal(1000);
    });

    it("should lock ERC721 tokens and only one", async () => {
      await expect(daoVault.lock(USER1.address, erc721.address, 1, 0)).to.be.revertedWith("DAOVault: No NFT to lock.");

      await expect(daoVault.connect(USER1).lock(USER1.address, erc721.address, 1, 0)).to.be.revertedWith(
        "DAOVault: The sender is not allowed to perform the action, access denied."
      );

      const oneYearLater = Number(await getCurrentBlockTime()) + 365 * 24 * 60 * 60 + 10;
      await expect(daoVault.lock(USER1.address, erc721.address, 1, oneYearLater)).to.be.revertedWith(
        "DAOVault: The lock time is too big."
      );

      expect(await daoVault.getUserVotingPower(USER1.address, erc721.address)).to.equal(0);

      await daoVault.connect(USER1).depositNFT(erc721.address, 0);
      await daoVault.connect(USER1).depositNFT(erc721.address, 1);
      await daoVault.lock(USER1.address, erc721.address, 0, 1000);

      expect(await daoVault.getUserVotingPower(USER1.address, erc721.address)).to.equal(1);

      await daoVault.lock(USER1.address, erc721.address, 0, 300);
      await daoVault.lock(USER1.address, erc721.address, 0, 2000);

      expect(await daoVault.getUserVotingPower(USER1.address, erc721.address)).to.equal(1);
    });

    it("should be able to check authorization with SBT", async () => {
      await expect(daoVault.lock(USER2.address, sbt.address, 0, 0)).to.be.revertedWith(
        "DAOVault: The user does not have the SBT token."
      );

      await daoVault.lock(USER1.address, sbt.address, 0, 0);

      await daoVault.lock(USER1.address, sbt.address, 0, 0);
    });
  });

  describe("withdraw", () => {
    it("should withdraw ERC20 tokens", async () => {
      await daoVault.connect(USER1).depositERC20(erc20.address, 1000);

      expect(await daoVault.getUserTokenBalance(USER1.address, erc20.address)).to.equal(1000);
      expect(await manager.getUserGroups(USER1.address)).to.deep.equal([`DAOGroup:DAO Token Holder`]);

      await daoVault.connect(USER1).withdrawERC20(erc20.address, 1000);

      expect(await daoVault.getUserTokenBalance(USER1.address, erc20.address)).to.equal(0);
      expect(await manager.getUserGroups(USER1.address)).to.deep.equal([]);
    });

    it("should not withdraw locked ERC20 tokens", async () => {
      await daoVault.connect(USER1).depositERC20(erc20.address, 1000);

      expect(await daoVault.getUserTokenBalance(USER1.address, erc20.address)).to.equal(1000);
      expect(await manager.getUserGroups(USER1.address)).to.deep.equal([`DAOGroup:DAO Token Holder`]);

      const lockTime = toBN(await getCurrentBlockTime())
        .plus(100)
        .toString();
      await daoVault.lock(USER1.address, erc20.address, 1000, lockTime);

      await expect(daoVault.lock(USER1.address, erc20.address, 0, lockTime)).to.be.revertedWith(
        "DAOVault: The amount to lock should be more than 0."
      );

      await expect(daoVault.connect(USER1).withdrawERC20(erc20.address, 1000)).to.be.revertedWith(
        "DAOVault: Trying to withdraw more than locked."
      );

      await setTime(toBN(lockTime).plus(1).toNumber());

      await daoVault.connect(USER1).withdrawERC20(erc20.address, 500);

      expect(await manager.getUserGroups(USER1.address)).to.deep.equal([`DAOGroup:DAO Token Holder`]);

      await daoVault.connect(USER1).withdrawERC20(erc20.address, 500);

      expect(await manager.getUserGroups(USER1.address)).to.deep.equal([]);
    });

    it("should withdraw Native tokens", async () => {
      const balanceBefore = toBN((await getBalance(USER1.address)) as unknown as string);

      await daoVault.connect(USER1).depositNative({ value: ether });

      expect(await daoVault.getUserTokenBalance(USER1.address, ETHEREUM_ADDRESS)).to.equal(ether);

      expect(toBN((await getBalance(USER1.address)) as unknown as string).toNumber()).to.be.closeTo(
        balanceBefore.minus(ether).toNumber(),
        toBN(ether).div(100).toNumber()
      );

      expect(await daoVault.getTokenSupply(ETHEREUM_ADDRESS)).to.equal(ether);

      await daoVault.connect(USER1).withdrawNative(ether);

      expect(await daoVault.getUserTokenBalance(USER1.address, ETHEREUM_ADDRESS)).to.equal(0);

      expect(toBN((await getBalance(USER1.address)) as unknown as string).toNumber()).to.be.closeTo(
        balanceBefore.toNumber(),
        toBN(ether).div(100).toNumber()
      );

      expect(await daoVault.getTokenSupply(ETHEREUM_ADDRESS)).to.equal(0);
    });

    it("should not withdraw locked Native tokens", async () => {
      await daoVault.connect(USER1).depositNative({ value: 1000 });

      const lockTime = toBN(await getCurrentBlockTime()).plus(100);
      await daoVault.lock(USER1.address, ETHEREUM_ADDRESS, 1000, lockTime.toString());

      await expect(daoVault.connect(USER1).withdrawNative(1000)).to.be.revertedWith(
        "DAOVault: Trying to withdraw more than locked."
      );

      await setTime(toBN(lockTime).plus(1).toNumber());

      await daoVault.connect(USER1).withdrawNative(1000);

      expect(await daoVault.getUserTokenBalance(USER1.address, ETHEREUM_ADDRESS)).to.equal(0);
    });

    it("should delete from the group only if all tokens are withdrawn", async () => {
      await daoVault.connect(USER1).depositNative({ value: 1000 });
      await daoVault.connect(USER1).depositERC20(erc20.address, 1000);

      await daoVault.connect(USER1).withdrawNative(1000);

      expect(await manager.getUserGroups(USER1.address)).to.deep.equal([`DAOGroup:DAO Token Holder`]);

      await daoVault.connect(USER1).withdrawERC20(erc20.address, 1000);

      expect(await manager.getUserGroups(USER1.address)).to.deep.equal([]);
    });

    it("should revert if amount was not withdrawn", async () => {
      await impersonate(erc20.address);
      await setBalance(erc20.address);

      const signer = await ethers.getSigner(erc20.address);

      const tx = {
        to: daoVault.address,
        value: 1000,
      };

      const receiptTx = await signer.sendTransaction(tx);

      await receiptTx.wait();

      await expect(daoVault.withdrawNative(1000)).to.be.revertedWith("DAOVault: Not enough tokens to withdraw.");

      await expect(daoVault.connect(signer).withdrawNative(1000)).to.be.revertedWith(
        "TokenBalance: Transferring of native currency failed."
      );
    });

    it("should withdraw ERC721 tokens", async () => {
      await daoVault.connect(USER1).depositNFT(erc721.address, 0);

      expect(castBN(await daoVault.getUserNFTs(USER1.address, erc721.address))).to.deep.equal([0]);

      await daoVault.connect(USER1).depositNFT(erc721.address, 1);

      expect(castBN(await daoVault.getUserNFTs(USER1.address, erc721.address))).to.deep.equal([0, 1]);

      await daoVault.lock(USER1.address, erc721.address, 1, 1000);

      await expect(daoVault.connect(USER1).withdrawNFT(erc721.address, 0)).to.be.revertedWith(
        "DAOVault: Trying to withdraw locked NFT."
      );

      expect(await daoVault.getUserVotingPower(USER1.address, erc721.address)).to.equal(1);

      await setTime(Number(await getCurrentBlockTime()) + 1000);

      await daoVault.connect(USER1).withdrawNFT(erc721.address, 0);
    });

    it("should withdraw different ERC721 tokens", async () => {
      await daoVault.connect(USER1).depositNFT(erc721.address, 0);
      await daoVault.connect(USER1).depositNFT(erc721_2.address, 0);

      expect(await manager.getUserGroups(USER1.address)).to.deep.equal([`DAOGroup:DAO Token Holder`]);

      await daoVault.connect(USER1).withdrawNFT(erc721.address, 0);

      expect(await manager.getUserGroups(USER1.address)).to.deep.equal([`DAOGroup:DAO Token Holder`]);

      await daoVault.connect(USER1).withdrawNFT(erc721_2.address, 0);

      expect(await manager.getUserGroups(USER1.address)).to.deep.equal([]);
    });

    it("should revoke SBT Authorization", async () => {
      await expect(daoVault.connect(USER2).revokeSBTAuthorization(sbt.address)).to.be.revertedWith(
        "DAOVault: The user is not authorized or token does not supported."
      );

      await daoVault.connect(USER1).authorizeBySBT(sbt.address);

      await daoVault.connect(USER1).revokeSBTAuthorization(sbt.address);
    });
  });

  describe("getters", () => {
    it("should get list of user tokens", async () => {
      await daoVault.connect(USER1).depositNative({ value: 1000 });
      await daoVault.connect(USER1).depositERC20(erc20.address, 1000);

      expect(await daoVault.getUserTokens(USER1.address)).to.deep.equal([ETHEREUM_ADDRESS, erc20.address]);
    });
  });
});
