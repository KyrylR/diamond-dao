import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { Reverter } from "@/test/helpers/reverter";
import { wei } from "@/scripts/utils/utils";

import { DefaultERC20Params } from "../utils/constants";

import { cast } from "@/test/utils/caster";

import { ERC20  } from "@ethers-v5";

describe("ERC20", async () => {
  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let USER1: SignerWithAddress;
  let USER2: SignerWithAddress;
  let USER3: SignerWithAddress;

  const ERC20Resource = "ERC20";

  let token: ERC20;

  before("setup", async () => {
    [OWNER, USER1, USER2, USER3] = await ethers.getSigners();

    await reverter.snapshot();
  });

  afterEach("revert", reverter.revert);

  async function deployERC20(params, master) {
    token = await ERC20.new();

    await token.__ERC20_init(params, ERC20Resource, { from: master });
  }

  describe("access", () => {
    beforeEach("setup", async () => {
      await deployERC20(DefaultERC20Params, OWNER);
    });

    it("should not initialize twice", async () => {
      await truffleAssert.reverts(
        token.__ERC20_init(DefaultERC20Params, ERC20Resource),
        "Initializable: contract is already initialized"
      );
    });
  });

  describe("mintTo", () => {
    it("should be able to mint tokens", async () => {
      await deployERC20(DefaultERC20Params, OWNER);

      assert.equal(await token.balanceOf(USER2), "0");

      await token.mintTo(USER2, wei("100"), { from: OWNER });

      assert.equal(await token.balanceOf(USER2), wei("100"));
    });

    it("should be able to mint capped tokens", async () => {
      const tokenParams = {
        name: "name",
        symbol: "symbol",
        contractURI: "URI",
        decimals: 18,
        totalSupplyCap: wei("100"),
      };

      await deployERC20(tokenParams, OWNER);

      assert.equal(await token.balanceOf(USER2), "0");

      await token.mintTo(USER2, wei("100"), { from: OWNER });

      assert.equal(await token.balanceOf(USER2), wei("100"));
    });

    it("should not exceed the cap", async () => {
      const tokenParams = {
        name: "name",
        symbol: "symbol",
        contractURI: "URI",
        decimals: 18,
        totalSupplyCap: wei("100"),
      };

      await deployERC20(tokenParams, OWNER);

      await truffleAssert.reverts(
        token.mintTo(USER2, wei("1000"), { from: OWNER }),
        "[QGDK-015000]-The total supply capacity exceeded, minting is not allowed."
      );
    });

    it("should not be able to mint tokens due to permissions (1)", async () => {
      await deployERC20(DefaultERC20Params, OWNER);

      await truffleAssert.reverts(token.mintTo(USER2, wei("100"), { from: USER1 }), "Ownable: caller is not the owner");
    });
  });

  describe("burnFrom", () => {
    it("should be able to burn tokens", async () => {
      await deployERC20(DefaultERC20Params, OWNER);

      await token.mintTo(USER2, wei("100"), { from: OWNER });
      await token.burnFrom(USER2, wei("100"), { from: USER2 });

      assert.equal(await token.balanceOf(USER2), "0");
    });

    it("should be able to burn approved tokens", async () => {
      await deployERC20(DefaultERC20Params, OWNER);

      await token.mintTo(USER2, wei("100"), { from: OWNER });

      await truffleAssert.reverts(token.burnFrom(USER2, wei("100"), { from: USER1 }), "ERC20: insufficient allowance");

      await token.approve(USER1, wei("100"), { from: USER2 });

      await token.burnFrom(USER2, wei("100"), { from: USER1 });

      assert.equal(await token.balanceOf(USER2), "0");
    });

    it("should not burn tokens due to the permissions (1)", async () => {
      await deployERC20(DefaultERC20Params, OWNER);

      await token.mintTo(USER2, wei("100"), { from: OWNER });

      await truffleAssert.reverts(token.burnFrom(USER2, wei("100"), { from: USER1 }), "ERC20: insufficient allowance");
    });
  });

  describe("transfer", () => {
    it("should be able to transfer tokens", async () => {
      await deployERC20(DefaultERC20Params, OWNER);

      await token.mintTo(USER2, wei("100"), { from: OWNER });

      await token.transfer(USER1, wei("10"), { from: USER2 });

      assert.equal(await token.balanceOf(USER1), wei("10"));
    });

    it("should be able to transfer from tokens", async () => {
      await deployERC20(DefaultERC20Params, OWNER);

      await token.mintTo(USER2, wei("100"), { from: OWNER });

      await token.approve(USER3, wei("20"), { from: USER2 });

      await token.transferFrom(USER2, USER1, wei("20"), { from: USER3 });

      assert.equal(await token.balanceOf(USER1), wei("20"));
    });
  });

  describe("setContractMetadata", () => {
    it("should set new contract metadata", async () => {
      await deployERC20(DefaultERC20Params, OWNER);

      assert.equal(await token.contractURI(), DefaultERC20Params.contractURI);

      await token.setContractMetadata("NEW_URI", { from: OWNER });

      assert.equal(await token.contractURI(), "NEW_URI");
    });

    it("should not set contract metadata due to permissions", async () => {
      await deployERC20(DefaultERC20Params, OWNER);

      await truffleAssert.reverts(
        token.setContractMetadata("NEW_URI", { from: USER1 }),
        "Ownable: caller is not the owner"
      );
    });
  });
});
