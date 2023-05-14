import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { Reverter } from "@/test/helpers/reverter";
import { wei } from "@/scripts/utils/utils";

import {
  DAO_REGISTRY_NAME,
  DAO_VAULT_RESOURCE,
  MASTER_ROLE,
  UPDATE_PERMISSION,
  DAO_VAULT_NAME,
  RECEIVE_PERMISSION,
  SPEND_PERMISSION,
  BURN_PERMISSION,
  MINT_PERMISSION,
  ETHEREUM_ADDRESS,
  DefaultERC20Params,
  DefaultERC721Params,
  ERC20_NAME,
  ERC721_NAME,
} from "../utils/constants";

import { toBN, getBalance, setBalance } from "@/scripts/utils/utils";
import { getCurrentBlockTime, setTime } from "@/test/helpers/block-helper";
import { impersonate } from "@/test/helpers/impersonator";
import { castBN } from "@/test/utils/caster";

import { PermissionManager, DAOVault, ERC721, ERC20, SBT } from "@ethers-v5";


describe("DAOVault", () => {
  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let USER1: SignerWithAddress;
  let USER2: SignerWithAddress;

  let manager: PermissionManager;
  let daoVault: DAOVault;
  let erc20: ERC20;
  let erc721: ERC721;
  let erc721_2: ERC721;
  let sbt: SBT;

  const DAOVaultUpdateRole = "VUR";
  const TokenRoles = "TKR";

  const ERC20_RESOURCE = "ERC20";
  const ERC721_RESOURCE = "ERC721";
  const SBT_RESOURCE = "SBT";

  const ether = toBN(10).pow(18);

  before("setup", async () => {
    [OWNER, USER1, USER2] = await ethers.getSigners();

    registry = await DAORegistry.new();
    daoVault = await DAOVault.new();
    erc20 = await ERC20.new();
    erc721 = await ERC721.new();
    erc721_2 = await ERC721.new();
    sbt = await SBT.new();

    await registry.__DAORegistry_init(
      (
        await PermissionManager.new()
      ).address,
      OWNER,
      DAO_REGISTRY_NAME,
      "DAO_REGISTRY",
      "daoURI"
    );

    manager = await PermissionManager.at(await registry.getPermissionManager());

    await registry.addProxyContract(DAO_VAULT_NAME, daoVault.address);
    await registry.addProxyContract(ERC20_NAME, erc20.address);
    await registry.addProxyContract(ERC721_NAME, erc721.address);
    await registry.addProxyContract("ERC721_2", erc721_2.address);
    await registry.addProxyContract("SBT", sbt.address);

    daoVault = await DAOVault.at(await registry.getDAOVault());
    erc20 = await ERC20.at(await registry.getContract(ERC20_NAME));
    erc721 = await ERC721.at(await registry.getContract(ERC721_NAME));
    erc721_2 = await ERC721.at(await registry.getContract("ERC721_2"));
    sbt = await SBT.at(await registry.getContract("SBT"));

    await erc20.__ERC20_init(DefaultERC20Params, ERC20_RESOURCE);
    await erc721.__ERC721_init(DefaultERC721Params, ERC721_RESOURCE);
    await erc721_2.__ERC721_init(DefaultERC721Params, ERC721_RESOURCE);
    await sbt.__SBT_init(DefaultERC721Params, SBT_RESOURCE);

    await daoVault.__DAOVault_init(registry.address);

    await registry.injectDependencies(DAO_VAULT_NAME);

    const DAOVaultCreate = [DAO_VAULT_RESOURCE, [UPDATE_PERMISSION]];
    const TokenPermissions = [ERC20_RESOURCE, [MINT_PERMISSION, BURN_PERMISSION, SPEND_PERMISSION, RECEIVE_PERMISSION]];

    await manager.addPermissionsToRole(DAOVaultUpdateRole, [DAOVaultCreate], true);
    await manager.addPermissionsToRole(TokenRoles, [TokenPermissions], true);

    await manager.grantRoles(USER1, [TokenRoles]);

    await erc20.mintTo(USER1, "10000000", { from: OWNER });
    await erc20.approve(daoVault.address, "10000000", { from: USER1 });

    await erc721.mintTo(USER1, 0, "some_uri", { from: OWNER });
    await erc721.mintTo(USER1, 1, "some_uri", { from: OWNER });
    await erc721.setApprovalForAll(daoVault.address, true, { from: USER1 });

    await erc721_2.mintTo(USER1, 0, "some_uri", { from: OWNER });
    await erc721_2.setApprovalForAll(daoVault.address, true, { from: USER1 });

    await sbt.mintTo(OWNER, 0, "some_uri", 0, { from: OWNER });
    await sbt.mintTo(USER1, 1, "some_uri", 0, { from: OWNER });

    await manager.grantRoles(daoVault.address, [MASTER_ROLE]);

    await reverter.snapshot();
  });

  afterEach("revert", reverter.revert);

  describe("access", () => {
    it("only injector should set dependencies", async () => {
      await truffleAssert.reverts(
        daoVault.setDependencies(registry.address, "0x", { from: USER1 }),
        "Dependant: not an injector"
      );
    });

    it("should initialize only once", async () => {
      await truffleAssert.reverts(
        daoVault.__DAOVault_init(registry.address),
        "Initializable: contract is already initialized"
      );
    });
  });

  describe("deposit", () => {
    it("should deposit ERC20 tokens", async () => {
      assert.deepEqual(await registry.getAccountStatuses(USER1), [["DAO Token Holder"], [false]]);
      assert.deepEqual(await manager.getUserGroups(USER1), []);

      await daoVault.depositERC20(erc20.address, 1000, { from: USER1 });

      assert.deepEqual(await registry.getAccountStatuses(USER1), [["DAO Token Holder"], [true]]);

      assert.equal(await daoVault.userTokenBalance(USER1, erc20.address), 1000);

      assert.deepEqual(await manager.getUserGroups(USER1), [`DAOGroup:DAO_REGISTRY`]);
      assert.equal(
        (await daoVault.getUserVotingPower(USER1, erc20.address)).toString(),
        (await daoVault.userTokenBalance(USER1, erc20.address)).toString()
      );
      assert.equal((await daoVault.getTokenSupply(erc20.address)).toString(), "10000000");
    });

    it("should be able to deposit Native tokens", async () => {
      await daoVault.depositNative({ from: USER1, value: ether });

      assert.equal((await daoVault.userTokenBalance(USER1, ETHEREUM_ADDRESS)).toString(), ether.toString());
      assert.deepEqual(await manager.getUserGroups(USER1), [`DAOGroup:DAO_REGISTRY`]);
      assert.equal(
        (await daoVault.getUserVotingPower(USER1, ETHEREUM_ADDRESS)).toString(),
        (await daoVault.userTokenBalance(USER1, ETHEREUM_ADDRESS)).toString()
      );
    });

    it("should deposit ERC721 tokens", async () => {
      await daoVault.depositNFT(erc721.address, 0, { from: USER1 });

      assert.equal(await daoVault.getUserVotingPower(USER1, erc721.address), 1);

      assert.deepEqual(await manager.getUserGroups(USER1), [`DAOGroup:DAO_REGISTRY`]);

      await truffleAssert.reverts(
        daoVault.depositNFT(erc20.address, 0, { from: USER1 }),
        "[QGDK-007000]-The token does not supported."
      );
    });

    it("should be able authorize with SBT", async () => {
      assert.equal(await daoVault.getUserVotingPower(USER2, sbt.address), 0);
      assert.equal(await daoVault.getUserVotingPower(USER1, sbt.address), 1);

      await daoVault.authorizeBySBT(sbt.address, { from: USER1 });

      await truffleAssert.reverts(
        daoVault.authorizeBySBT(sbt.address, { from: USER2 }),
        "[QGDK-007001]-The user is not authorized or token does not supported."
      );

      assert.equal(await daoVault.getUserVotingPower(USER1, sbt.address), 1);

      assert.deepEqual(await manager.getUserGroups(USER1), [`DAOGroup:DAO_REGISTRY`]);
    });
  });

  describe("lock", () => {
    it("should lock ERC20 tokens", async () => {
      await truffleAssert.reverts(
        daoVault.lock(USER1, erc20.address, 1000, 1000, { from: OWNER }),
        "[QGDK-007007]-Not enough tokens to lock."
      );

      await truffleAssert.reverts(
        daoVault.lock(USER1, erc20.address, 1000, 1000, { from: USER1 }),
        "[QGDK-007010]-The sender is not allowed to perform the action, access denied."
      );

      await daoVault.depositERC20(erc20.address, 1000, { from: USER1 });

      await truffleAssert.reverts(
        daoVault.depositERC20(erc20.address, 1000, { from: USER1, value: 1000 }),
        "Transaction reverted: non-payable function was called with value 1000"
      );

      let result = await daoVault.getTimeLockInfo(USER1, erc20.address);
      assert.equal(result.withdrawalAmount, 1000);
      assert.equal(result.lockedAmount, 0);
      assert.equal(result.unlockTime, 0);

      assert.equal(await daoVault.userTokenBalance(USER1, erc20.address), 1000);

      const lockTime = (await getCurrentBlockTime()) + 1000;
      await daoVault.lock(USER1, erc20.address, 1000, lockTime, { from: OWNER });

      assert.equal(await daoVault.userTokenBalance(USER1, erc20.address), 1000);

      result = await daoVault.getTimeLockInfo(USER1, erc20.address);
      assert.equal(result.withdrawalAmount, 0);
      assert.equal(result.lockedAmount, 1000);
      assert.equal(result.unlockTime, lockTime);

      await daoVault.depositERC20(erc20.address, 100, { from: USER1 });

      result = await daoVault.getTimeLockInfo(USER1, erc20.address);
      assert.equal(result.withdrawalAmount, 100);
      assert.equal(result.lockedAmount, 1000);
      assert.equal(result.unlockTime, lockTime);

      await setTime(lockTime + 1);

      result = await daoVault.getTimeLockInfo(USER1, erc20.address);
      assert.equal(result.withdrawalAmount, 1100);
      assert.equal(result.lockedAmount, 0);
      assert.equal(result.unlockTime, 0);

      const newLockTime = (await getCurrentBlockTime()) + 1000;
      await daoVault.lock(USER1, erc20.address, 200, newLockTime, { from: OWNER });
      result = await daoVault.getTimeLockInfo(USER1, erc20.address);
      assert.equal(result.withdrawalAmount, 900);
      assert.equal(result.lockedAmount, 200);
      assert.equal(result.unlockTime, newLockTime);

      await daoVault.lock(USER1, erc20.address, 800, newLockTime + 10, { from: OWNER });
      result = await daoVault.getTimeLockInfo(USER1, erc20.address);
      assert.equal(result.withdrawalAmount, 300);
      assert.equal(result.lockedAmount, 800);
      assert.equal(result.unlockTime, newLockTime + 10);
    });

    it("should not lock ERC20 for too big period", async () => {
      await daoVault.depositERC20(erc20.address, 1000, { from: USER1 });
      const oneYearLater = (await getCurrentBlockTime()) + 365 * 24 * 60 * 60 + 10;
      await truffleAssert.reverts(
        daoVault.lock(USER1, erc20.address, 1000, oneYearLater, { from: OWNER }),
        "[QGDK-007002]-The lock time is too big."
      );
    });

    it("should lock Native tokens", async () => {
      await daoVault.depositNative({ from: USER1, value: 1000 });
      await truffleAssert.passes(daoVault.lock(USER1, ETHEREUM_ADDRESS, 1000, 1000, { from: OWNER }), "passes");

      assert.equal(await daoVault.userTokenBalance(USER1, ETHEREUM_ADDRESS), 1000);
    });

    it("should lock ERC721 tokens and only one", async () => {
      await truffleAssert.reverts(
        daoVault.lock(USER1, erc721.address, 1, 0, { from: OWNER }),
        "[QGDK-007008]-No NFT to lock."
      );

      await truffleAssert.reverts(
        daoVault.lock(USER1, erc721.address, 1, 1000, { from: USER1 }),
        "[QGDK-007010]-The sender is not allowed to perform the action, access denied."
      );

      const oneYearLater = (await getCurrentBlockTime()) + 365 * 24 * 60 * 60 + 10;
      await truffleAssert.reverts(
        daoVault.lock(USER1, erc721.address, 1, oneYearLater, { from: OWNER }),
        "[QGDK-007002]-The lock time is too big."
      );

      assert.equal(await daoVault.getUserVotingPower(USER1, erc721.address), 0);

      await daoVault.depositNFT(erc721.address, 0, { from: USER1 });
      await daoVault.depositNFT(erc721.address, 1, { from: USER1 });
      await truffleAssert.passes(daoVault.lock(USER1, erc721.address, 0, 1000, { from: OWNER }), "passes");

      assert.equal(await daoVault.getUserVotingPower(USER1, erc721.address), 1);

      await truffleAssert.passes(daoVault.lock(USER1, erc721.address, 0, 300, { from: OWNER }), "passes");
      await truffleAssert.passes(daoVault.lock(USER1, erc721.address, 0, 2000, { from: OWNER }), "passes");

      assert.equal(await daoVault.getUserVotingPower(USER1, erc721.address), 1);
    });

    it("should be able to check authorization with SBT", async () => {
      await truffleAssert.reverts(
        daoVault.lock(USER2, sbt.address, 0, 0, { from: OWNER }),
        "[QGDK-007006]-The user does not have the SBT token."
      );

      await truffleAssert.passes(daoVault.lock(USER1, sbt.address, 0, 0, { from: OWNER }), "passes");

      await truffleAssert.passes(daoVault.lock(USER1, sbt.address, 0, 0, { from: OWNER }), "passes");
    });
  });

  describe("withdraw", () => {
    it("should withdraw ERC20 tokens", async () => {
      await daoVault.depositERC20(erc20.address, 1000, { from: USER1 });

      assert.equal(await daoVault.userTokenBalance(USER1, erc20.address), 1000);
      assert.deepEqual(await manager.getUserGroups(USER1), [`DAOGroup:DAO_REGISTRY`]);

      await daoVault.withdrawERC20(erc20.address, 1000, { from: USER1 });

      assert.equal(toBN(await daoVault.userTokenBalance(USER1, erc20.address)).toString(), "0");
      assert.deepEqual(await manager.getUserGroups(USER1), []);
    });

    it("should not withdraw locked ERC20 tokens", async () => {
      await daoVault.depositERC20(erc20.address, 1000, { from: USER1 });

      assert.equal(await daoVault.userTokenBalance(USER1, erc20.address), 1000);
      assert.deepEqual(await manager.getUserGroups(USER1), [`DAOGroup:DAO_REGISTRY`]);

      const lockTime = toBN(await getCurrentBlockTime()).plus(100);
      await daoVault.lock(USER1, erc20.address, 1000, lockTime, { from: OWNER });

      await truffleAssert.reverts(
        daoVault.lock(USER1, erc20.address, 0, lockTime, { from: OWNER }),
        "[QGDK-007003]-The amount to lock should be more than 0."
      );

      await truffleAssert.reverts(
        daoVault.withdrawERC20(erc20.address, 1000, { from: USER1 }),
        "[QGDK-007009]-Trying to withdraw more than locked."
      );

      await setTime(lockTime.plus(1).toNumber());

      await truffleAssert.passes(daoVault.withdrawERC20(erc20.address, 500, { from: USER1 }), "passes");

      assert.deepEqual(await manager.getUserGroups(USER1), [`DAOGroup:DAO_REGISTRY`]);

      await truffleAssert.passes(daoVault.withdrawERC20(erc20.address, 500, { from: USER1 }), "passes");

      assert.deepEqual(await manager.getUserGroups(USER1), []);
    });

    it("should withdraw Native tokens", async () => {
      const balanceBefore = toBN(await web3.eth.getBalance(USER1));

      await daoVault.depositNative({ from: USER1, value: ether });

      assert.equal(await daoVault.userTokenBalance(USER1, ETHEREUM_ADDRESS), ether.toString());

      assert.approximately(
        toBN(await getBalance(USER1)).toNumber(),
        balanceBefore.minus(ether).toNumber(),
        ether.div(100).toNumber()
      );

      assert.equal((await daoVault.getTokenSupply(ETHEREUM_ADDRESS)).toString(), ether.toString());

      await daoVault.withdrawNative(ether, { from: USER1 });

      assert.equal(await daoVault.userTokenBalance(USER1, ETHEREUM_ADDRESS), 0);

      assert.approximately(
        toBN(await getBalance(USER1)).toNumber(),
        balanceBefore.toNumber(),
        ether.div(100).toNumber()
      );

      assert.equal((await daoVault.getTokenSupply(ETHEREUM_ADDRESS)).toString(), "0");
    });

    it("should not withdraw locked Native tokens", async () => {
      await daoVault.depositNative({ from: USER1, value: 1000 });

      const lockTime = toBN(await getCurrentBlockTime()).plus(100);
      await daoVault.lock(USER1, ETHEREUM_ADDRESS, 1000, lockTime, { from: OWNER });

      await truffleAssert.reverts(
        daoVault.withdrawNative(1000, { from: USER1 }),
        "[QGDK-007009]-Trying to withdraw more than locked."
      );

      await setTime(lockTime.plus(1).toNumber());

      await daoVault.withdrawNative(1000, { from: USER1 });

      assert.equal(await daoVault.userTokenBalance(USER1, ETHEREUM_ADDRESS), 0);
    });

    it("should delete from the group only if all tokens are withdrawn", async () => {
      await daoVault.depositNative({ from: USER1, value: 1000 });
      await daoVault.depositERC20(erc20.address, 1000, { from: USER1 });

      await daoVault.withdrawNative(1000, { from: USER1 });

      assert.deepEqual(await manager.getUserGroups(USER1), [`DAOGroup:DAO_REGISTRY`]);

      await daoVault.withdrawERC20(erc20.address, 1000, { from: USER1 });

      assert.deepEqual(await manager.getUserGroups(USER1), []);
    });

    it("should revert if amount was not withdrawn", async () => {
      await impersonate(erc20.address);
      await setBalance(erc20.address);
      await web3.eth.sendTransaction({
        from: erc20.address,
        to: daoVault.address,
        value: 1000,
      });

      await truffleAssert.reverts(
        daoVault.withdrawNative(1000, { from: erc20.address }),
        "[QGDK-019000]-Transferring of native currency failed."
      );
    });

    it("should withdraw ERC721 tokens", async () => {
      await daoVault.depositNFT(erc721.address, 0, { from: USER1 });

      assert.deepEqual(castBN(await daoVault.getUserNFTs(USER1, erc721.address)), ["0"]);

      await daoVault.depositNFT(erc721.address, 1, { from: USER1 });

      assert.deepEqual(castBN(await daoVault.getUserNFTs(USER1, erc721.address)), ["0", "1"]);

      await truffleAssert.passes(daoVault.lock(USER1, erc721.address, 1, 1000, { from: OWNER }), "passes");

      await truffleAssert.reverts(
        daoVault.withdrawNFT(erc721.address, 0, { from: USER1 }),
        "[QGDK-007004]-Trying to withdraw locked NFT."
      );

      await truffleAssert.passes(daoVault.withdrawNFT(erc721.address, 1, { from: USER1 }), "passes");

      assert.equal(await daoVault.getUserVotingPower(USER1, erc721.address), 1);

      await setTime((await getCurrentBlockTime()) + 1000);

      await truffleAssert.passes(daoVault.withdrawNFT(erc721.address, 0, { from: USER1 }), "passes");
    });

    it("should withdraw different ERC721 tokens", async () => {
      await daoVault.depositNFT(erc721.address, 0, { from: USER1 });
      await daoVault.depositNFT(erc721_2.address, 0, { from: USER1 });

      assert.deepEqual(await manager.getUserGroups(USER1), [`DAOGroup:DAO_REGISTRY`]);

      await truffleAssert.passes(daoVault.withdrawNFT(erc721.address, 0, { from: USER1 }), "passes");

      assert.deepEqual(await manager.getUserGroups(USER1), [`DAOGroup:DAO_REGISTRY`]);

      await truffleAssert.passes(daoVault.withdrawNFT(erc721_2.address, 0, { from: USER1 }), "passes");

      assert.deepEqual(await manager.getUserGroups(USER1), []);
    });

    it("should revoke SBT Authorization", async () => {
      await truffleAssert.reverts(
        daoVault.revokeSBTAuthorization(sbt.address, { from: USER2 }),
        "[QGDK-007005]-The user is not authorized or token does not supported."
      );

      await daoVault.authorizeBySBT(sbt.address, { from: USER1 });

      await truffleAssert.passes(daoVault.revokeSBTAuthorization(sbt.address, { from: USER1 }), "passes");
    });
  });

  describe("getters", () => {
    it("should get list of user tokens", async () => {
      await daoVault.depositNative({ from: USER1, value: 1000 });
      await daoVault.depositERC20(erc20.address, 1000, { from: USER1 });

      assert.deepEqual(await daoVault.getUserTokens(USER1), [ETHEREUM_ADDRESS, erc20.address]);
    });
  });
});
