import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { Reverter } from "@/test/helpers/reverter";
import { wei } from "@/scripts/utils/utils";

import { DefaultERC721Params } from "../utils/constants";

import { cast } from "@/test/utils/caster";

import { ERC721  } from "@ethers-v5";

describe("ERC721", async () => {
  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let USER1: SignerWithAddress;
  let USER2: SignerWithAddress;
  let USER3: SignerWithAddress;

  const ERC721Resource = "ERC721";

  let token: ERC721;

  before("setup", async () => {
    [OWNER, USER1, USER2, USER3] = await ethers.getSigners();

    await reverter.snapshot();
  });

  afterEach("revert", reverter.revert);

  async function deployERC721(params, master) {
    token = await ERC721.new();

    await token.__ERC721_init(params, ERC721Resource, { from: master });
  }

  describe("access", () => {
    beforeEach("setup", async () => {
      await deployERC721(DefaultERC721Params, OWNER);
    });

    it("should not initialize twice", async () => {
      await truffleAssert.reverts(
        token.__ERC721_init(DefaultERC721Params, ERC721Resource),
        "Initializable: contract is already initialized"
      );
    });
  });

  describe("mintTo", () => {
    it("should be able to mint tokens", async () => {
      await deployERC721(DefaultERC721Params, OWNER);

      assert.equal(await token.balanceOf(USER2), "0");

      await token.mintTo(USER2, 1, "_1", { from: OWNER });

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

      await deployERC721(tokenParams, OWNER);

      assert.equal(await token.balanceOf(USER2), "0");

      await token.mintTo(USER2, 1, "1", { from: OWNER });
      await token.mintTo(USER2, 3, "3", { from: OWNER });

      assert.equal(await token.balanceOf(USER2), 2);
      assert.equal(await token.tokenOfOwnerByIndex(USER2, 0), "1");
      assert.equal(await token.tokenOfOwnerByIndex(USER2, 1), "3");

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

      await deployERC721(tokenParams, OWNER);

      await token.mintTo(USER2, 2, "2", { from: OWNER });
      await truffleAssert.reverts(
        token.mintTo(USER2, 3, "3", { from: OWNER }),
        "[QGDK-016000]-The total supply capacity exceeded, minting is not allowed."
      );
    });

    it("should not be able to mint tokens due to permissions (1)", async () => {
      await deployERC721(DefaultERC721Params, OWNER);

      await truffleAssert.reverts(token.mintTo(USER2, 1, "1", { from: USER1 }), "Ownable: caller is not the owner");
    });
  });

  describe("burnFrom", () => {
    it("should be able to burn tokens", async () => {
      await deployERC721(DefaultERC721Params, OWNER);

      await token.mintTo(USER2, 1, "1", { from: OWNER });
      await token.burnFrom(USER2, 1, { from: USER2 });

      assert.equal(await token.balanceOf(USER2), "0");

      await truffleAssert.reverts(token.tokenURI(1), "ERC721: invalid token ID");
    });

    it("should be able to burn approved token", async () => {
      await deployERC721(DefaultERC721Params, OWNER);

      await token.mintTo(USER2, 1, "1", { from: OWNER });

      await truffleAssert.reverts(
        token.burnFrom(USER2, 1, { from: USER1 }),
        "[QGDK-016001]-Burn not approved by the owner of the NFT."
      );

      await token.approve(USER1, 1, { from: USER2 });

      await token.burnFrom(USER2, 1, { from: USER1 });

      assert.equal(await token.balanceOf(USER2), "0");
    });

    it("should be able to burn approvedAll tokens", async () => {
      await deployERC721(DefaultERC721Params, OWNER);

      await token.mintTo(USER2, 1, "1", { from: OWNER });

      await truffleAssert.reverts(
        token.burnFrom(USER2, 1, { from: USER1 }),
        "[QGDK-016001]-Burn not approved by the owner of the NFT."
      );

      await token.setApprovalForAll(USER1, true, { from: USER2 });

      await token.burnFrom(USER2, 1, { from: USER1 });

      assert.equal(await token.balanceOf(USER2), "0");
    });

    it("should not burn tokens due to the permissions (1)", async () => {
      await deployERC721(DefaultERC721Params, OWNER);

      await token.mintTo(USER2, 1, "1", { from: OWNER });

      await truffleAssert.reverts(
        token.burnFrom(USER2, 1, { from: USER1 }),
        "[QGDK-016001]-Burn not approved by the owner of the NFT."
      );
    });
  });

  describe("transfer", () => {
    it("should be able to transfer tokens", async () => {
      await deployERC721(DefaultERC721Params, OWNER);

      await token.mintTo(USER2, 1, "1", { from: OWNER });

      await token.transferFrom(USER2, USER1, 1, { from: USER2 });

      assert.equal(await token.balanceOf(USER1), 1);
      assert.equal(await token.tokenOfOwnerByIndex(USER1, 0), "1");
    });

    it("should be able to transfer from tokens", async () => {
      await deployERC721(DefaultERC721Params, OWNER);

      await token.mintTo(USER2, 1, "1", { from: OWNER });

      await token.approve(USER3, 1, { from: USER2 });

      await token.transferFrom(USER2, USER1, 1, { from: USER3 });

      assert.equal(await token.balanceOf(USER1), 1);
      assert.equal(await token.tokenOfOwnerByIndex(USER1, 0), "1");
    });
  });

  describe("setContractMetadata", () => {
    it("should set new contract metadata", async () => {
      await deployERC721(DefaultERC721Params, OWNER);

      assert.equal(await token.contractURI(), DefaultERC721Params.contractURI);

      await token.setContractMetadata("NEW_URI", { from: OWNER });

      assert.equal(await token.contractURI(), "NEW_URI");
    });

    it("should not set contract metadata due to permissions", async () => {
      await deployERC721(DefaultERC721Params, OWNER);

      await truffleAssert.reverts(
        token.setContractMetadata("NEW_URI", { from: USER1 }),
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("setBaseURI", () => {
    it("should set new base uri", async () => {
      await deployERC721(DefaultERC721Params, OWNER);

      assert.equal(await token.baseURI(), DefaultERC721Params.baseURI);

      await token.setBaseURI("NEW_BASE_URI", { from: OWNER });

      assert.equal(await token.baseURI(), "NEW_BASE_URI");
    });

    it("should not set base uri due to permissions", async () => {
      await deployERC721(DefaultERC721Params, OWNER);

      await truffleAssert.reverts(
        token.setBaseURI("NEW_BASE_URI", { from: USER1 }),
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("setTokenURI", () => {
    beforeEach("setup", async () => {
      await deployERC721(DefaultERC721Params, OWNER);

      await token.mintTo(USER1, 1, "1", { from: OWNER });
    });

    it("should set new token uri", async () => {
      assert.equal(await token.tokenURI(1), "BASE_URI1");

      await token.setTokenURI(1, "_1", { from: USER1 });

      assert.equal(await token.tokenURI(1), "BASE_URI_1");
    });

    it("should not set token uri due to permissions", async () => {
      await truffleAssert.reverts(
        token.setTokenURI(1, "_1", { from: USER2 }),
        "[QGDK-016002]-Set token URI not approved by the owner of the NFT."
      );
    });

    it("should be able to set token uri if approved", async () => {
      await truffleAssert.reverts(
        token.setTokenURI(1, "_TOKEN_URI_1", { from: USER2 }),
        "[QGDK-016002]-Set token URI not approved by the owner of the NFT."
      );

      await token.approve(USER2, 1, { from: USER1 });

      await truffleAssert.passes(token.setTokenURI(1, "_TOKEN_URI_1", { from: USER2 }), "passes");

      assert.equal(await token.tokenURI(1), "BASE_URI_TOKEN_URI_1");
    });

    it("should be able to set token uri if approvedAll", async () => {
      await truffleAssert.reverts(
        token.setTokenURI(1, "_TOKEN_URI_1", { from: USER2 }),
        "[QGDK-016002]-Set token URI not approved by the owner of the NFT."
      );

      await token.setApprovalForAll(USER2, true, { from: USER1 });

      await truffleAssert.passes(token.setTokenURI(1, "_TOKEN_URI_1", { from: USER2 }), "passes");

      assert.equal(await token.tokenURI(1), "BASE_URI_TOKEN_URI_1");
    });
  });

  describe("supportsInterface", () => {
    it("should support interfaces", async () => {
      await deployERC721(DefaultERC721Params, OWNER);

      // IERC721 and IERC721Upgradeable - 0x80ac58cd
      assert.isTrue(await token.supportsInterface("0x80ac58cd"));

      // IERC721Enumerable and IERC721EnumerableUpgradeable - 0x780e9d63
      assert.isTrue(await token.supportsInterface("0x780e9d63"));

      // IERC721 - 0xa57a25b8
      assert.isTrue(await token.supportsInterface("0xa57a25b8"));
    });
  });
});
