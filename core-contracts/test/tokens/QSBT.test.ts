import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { Reverter } from "@/test/helpers/reverter";
import { accounts, wei } from "@/scripts/utils/utils";

import { DefaultSBTParams } from "../utils/constants";

import { cast } from "@/test/utils/caster";

import { SBT  } from "@ethers-v5";

describe("QSBT", async () => {
  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let USER1: SignerWithAddress;
  let USER2: SignerWithAddress;
  let USER3: SignerWithAddress;

  const QSBTResource = "QSBT";

  let token: SBT;

  before("setup", async () => {
    OWNER = await accounts(0);
    USER1 = await accounts(1);
    USER2 = await accounts(2);
    USER3 = await accounts(3);

    await reverter.snapshot();
  });

  afterEach("revert", reverter.revert);

  async function deployQSBTFull(params, master) {
    token = await QSBTFull.new();

    await token.__QSBT_init(params, QSBTResource, { from: master });
  }

  async function deployQSBT(params, master) {
    token = await QSBT.new();

    await token.__QSBT_init(params, QSBTResource, { from: master });
  }

  describe("access", () => {
    beforeEach("setup", async () => {
      await deployQSBTFull(DefaultSBTParams, OWNER);
    });

    it("should not initialize twice", async () => {
      await truffleAssert.reverts(
        token.__QSBT_init(DefaultSBTParams, QSBTResource),
        "Initializable: contract is already initialized"
      );
    });
  });

  describe("mintTo", () => {
    it("should be able to mint tokens", async () => {
      await deployQSBT(DefaultSBTParams, OWNER);

      assert.equal(await token.balanceOf(USER2), "0");

      await token.mintTo(USER2, 1, "_1", 3, { from: OWNER });

      assert.equal(await token.burnAuth(1), "3");

      assert.equal(await token.balanceOf(USER2), "1");
      assert.equal(await token.tokenOfOwnerByIndex(USER2, 0), "1");

      assert.equal(await token.tokenURI(1), "BASE_URI_1");
    });

    it("should be able to mint capped tokens", async () => {
      const tokenParams = {
        name: "name",
        symbol: "symbol",
        contractURI: "URI",
        baseURI: "",
        totalSupplyCap: 2,
      };

      await deployQSBT(tokenParams, OWNER);

      assert.equal(await token.balanceOf(USER2), "0");

      await token.mintTo(USER2, 1, "1", 3, { from: OWNER });

      await truffleAssert.reverts(
        token.mintTo(USER2, 3, "3", 3, { from: OWNER }),
        "[QGDK-020002]-The user already has a SBT."
      );

      await token.mintTo(USER1, 3, "3", 3, { from: OWNER });

      assert.equal(await token.balanceOf(USER2), 1);
      assert.equal(await token.tokenOfOwnerByIndex(USER2, 0), "1");
      assert.equal(await token.tokenOfOwnerByIndex(USER1, 0), "3");

      assert.equal(await token.tokenURI(1), "1");
      assert.equal(await token.tokenURI(3), "3");
    });

    it("should not exceed the cap", async () => {
      const tokenParams = {
        name: "name",
        symbol: "symbol",
        contractURI: "URI",
        baseURI: "",
        totalSupplyCap: 1,
      };

      await deployQSBT(tokenParams, OWNER);

      await token.mintTo(USER2, 2, "2", 3, { from: OWNER });
      await truffleAssert.reverts(
        token.mintTo(USER1, 3, "3", 3, { from: OWNER }),
        "[QGDK-020000]-The total supply capacity exceeded, minting is not allowed."
      );
    });

    it("should not be able to mint tokens due to permissions (1)", async () => {
      await deployQSBTFull(DefaultSBTParams, OWNER);

      await truffleAssert.reverts(token.mintTo(USER2, 1, "1", 3, { from: USER1 }), "Ownable: caller is not the owner");
    });
  });

  describe("burn", () => {
    it("should be able to burn tokens with BurnAuth: Both, OwnerOnly and IssuerOnly", async () => {
      await deployQSBTFull(DefaultSBTParams, OWNER);

      // ====== IssuerOnly ======
      await token.mintTo(USER2, 1, "1", 0, { from: OWNER });
      await truffleAssert.reverts(token.burn(1, { from: USER2 }), "[QGDK-020003]-Burn not authorized.");
      assert.isTrue(await token.isAbleToBurn(OWNER, 1));
      assert.isFalse(await token.isAbleToBurn(USER2, 1));
      await token.burn(1, { from: OWNER });
      // ==================

      // ====== OwnerOnly ======
      await token.mintTo(USER2, 1, "1", 1, { from: OWNER });
      await truffleAssert.reverts(token.burn(1, { from: OWNER }), "[QGDK-020003]-Burn not authorized.");
      assert.isTrue(await token.isAbleToBurn(USER2, 1));
      assert.isFalse(await token.isAbleToBurn(OWNER, 1));
      await token.burn(1, { from: USER2 });
      // ==================

      // ====== Both ======
      await token.mintTo(USER2, 1, "1", 2, { from: OWNER });
      await token.burn(1, { from: OWNER });
      await token.mintTo(USER2, 1, "1", 2, { from: OWNER });
      assert.isTrue(await token.isAbleToBurn(USER2, 1));
      assert.isTrue(await token.isAbleToBurn(OWNER, 1));
      await token.burn(1, { from: USER2 });
      // ==================

      assert.equal(await token.balanceOf(USER2), "0");

      await truffleAssert.reverts(token.tokenURI(1), "ERC721: invalid token ID");
    });

    it("should be able to burn approved token", async () => {
      await deployQSBTFull(DefaultSBTParams, OWNER);

      await token.mintTo(USER2, 1, "1", 1, { from: OWNER });

      await truffleAssert.reverts(token.burn(1, { from: USER1 }), "[QGDK-020003]-Burn not authorized.");

      await token.approve(USER1, 1, { from: USER2 });

      await token.burn(1, { from: USER1 });

      assert.equal(await token.balanceOf(USER2), "0");
    });

    it("should be able to burn approvedAll tokens", async () => {
      await deployQSBTFull(DefaultSBTParams, OWNER);

      await token.mintTo(USER2, 1, "1", 1, { from: OWNER });

      await truffleAssert.reverts(token.burn(1, { from: USER1 }), "[QGDK-020003]-Burn not authorized.");

      await token.setApprovalForAll(USER1, true, { from: USER2 });

      await token.burn(1, { from: USER1 });

      assert.equal(await token.balanceOf(USER2), "0");
    });

    it("should not burn tokens due to the permissions (1)", async () => {
      await deployQSBTFull(DefaultSBTParams, OWNER);

      await token.mintTo(USER2, 1, "1", 3, { from: OWNER });

      await truffleAssert.reverts(token.burn(1, { from: USER1 }), "[QGDK-020003]-Burn not authorized.");
    });
  });

  describe("transfer", () => {
    it("should not be able to transfer tokens", async () => {
      await deployQSBTFull(DefaultSBTParams, OWNER);

      await token.mintTo(USER2, 1, "1", 3, { from: OWNER });

      await truffleAssert.reverts(
        token.transferFrom(USER2, USER1, 1, { from: USER2 }),
        "[QGDK-020004]-SBT is not transferable."
      );

      assert.equal(await token.balanceOf(USER1), 0);
    });
  });

  describe("setContractMetadata", () => {
    it("should set new contract metadata", async () => {
      await deployQSBTFull(DefaultSBTParams, OWNER);

      assert.equal(await token.contractURI(), DefaultSBTParams.contractURI);

      await token.setContractMetadata("NEW_URI", { from: OWNER });

      assert.equal(await token.contractURI(), "NEW_URI");
    });

    it("should not set contract metadata due to permissions", async () => {
      await deployQSBTFull(DefaultSBTParams, OWNER);

      await truffleAssert.reverts(
        token.setContractMetadata("NEW_URI", { from: USER1 }),
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("setBaseURI", () => {
    it("should set new base uri", async () => {
      await deployQSBTFull(DefaultSBTParams, OWNER);

      assert.equal(await token.baseURI(), DefaultSBTParams.baseURI);

      await token.setBaseURI("NEW_BASE_URI", { from: OWNER });

      assert.equal(await token.baseURI(), "NEW_BASE_URI");
    });

    it("should not set base uri due to permissions", async () => {
      await deployQSBTFull(DefaultSBTParams, OWNER);

      await truffleAssert.reverts(
        token.setBaseURI("NEW_BASE_URI", { from: USER1 }),
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("setTokenURI", () => {
    beforeEach("setup", async () => {
      await deployQSBTFull(DefaultSBTParams, OWNER);

      await token.mintTo(USER1, 1, "1", 3, { from: OWNER });
    });

    it("should set new token uri", async () => {
      assert.equal(await token.tokenURI(1), "BASE_URI1");

      await token.setTokenURI(1, "_1", { from: USER1 });

      assert.equal(await token.tokenURI(1), "BASE_URI_1");
    });

    it("should not set token uri due to permissions", async () => {
      await truffleAssert.reverts(
        token.setTokenURI(1, "_1", { from: USER2 }),
        "[QGDK-020001]-Set token URI not approved by the owner of the SBT."
      );
    });

    it("should be able to set token uri if approved", async () => {
      await truffleAssert.reverts(
        token.setTokenURI(1, "_TOKEN_URI_1", { from: USER2 }),
        "[QGDK-020001]-Set token URI not approved by the owner of the SBT."
      );

      await token.approve(USER2, 1, { from: USER1 });

      await truffleAssert.passes(token.setTokenURI(1, "_TOKEN_URI_1", { from: USER2 }), "passes");

      assert.equal(await token.tokenURI(1), "BASE_URI_TOKEN_URI_1");
    });

    it("should be able to set token uri if approvedAll", async () => {
      await truffleAssert.reverts(
        token.setTokenURI(1, "_TOKEN_URI_1", { from: USER2 }),
        "[QGDK-020001]-Set token URI not approved by the owner of the SBT."
      );

      await token.setApprovalForAll(USER2, true, { from: USER1 });

      await truffleAssert.passes(token.setTokenURI(1, "_TOKEN_URI_1", { from: USER2 }), "passes");

      assert.equal(await token.tokenURI(1), "BASE_URI_TOKEN_URI_1");
    });
  });

  describe("supportsInterface", () => {
    it("should support interfaces", async () => {
      await deployQSBTFull(DefaultSBTParams, OWNER);

      // IQSBT - 0xd1406bcb
      assert.isTrue(await token.supportsInterface("0xd1406bcb"));

      // ERC5484 - 0x0489b56f
      assert.isTrue(await token.supportsInterface("0x0489b56f"));

      // IERC721 and IERC721Upgradeable - 0x80ac58cd
      assert.isTrue(await token.supportsInterface("0x80ac58cd"));

      // IERC721Enumerable and IERC721EnumerableUpgradeable - 0x780e9d63
      assert.isTrue(await token.supportsInterface("0x780e9d63"));
    });
  });
});
