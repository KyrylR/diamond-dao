import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { Reverter } from "@/test/helpers/reverter";
import { wei } from "@/scripts/utils/utils";

import { DefaultERC20Params } from "../utils/constants";

import { ERC20Extended } from "@ethers-v5";

describe("ERC20", async () => {
  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let USER1: SignerWithAddress;
  let USER2: SignerWithAddress;
  let USER3: SignerWithAddress;

  const ERC20Resource = "ERC20";

  let token: ERC20Extended;

  before("setup", async () => {
    [OWNER, USER1, USER2, USER3] = await ethers.getSigners();

    await reverter.snapshot();
  });

  afterEach("revert", reverter.revert);

  async function deployERC20(params: any, master: any) {
    const ERC20Extended = await ethers.getContractFactory("ERC20Extended");
    token = await ERC20Extended.deploy();

    await token.connect(master).__ERC20_init(params, ERC20Resource);
  }

  describe("access", () => {
    beforeEach("setup", async () => {
      await deployERC20(DefaultERC20Params, OWNER);
    });

    it("should not initialize twice", async () => {
      await expect(token.__ERC20_init(DefaultERC20Params, ERC20Resource)).to.be.revertedWith(
        "Initializable: contract is already initialized"
      );
    });
  });

  describe("mintTo", () => {
    it("should be able to mint tokens", async () => {
      await deployERC20(DefaultERC20Params, OWNER);

      expect(await token.balanceOf(USER2.address)).to.equal(wei("0"));

      await token.mintTo(USER2.address, wei("100"));

      expect(await token.balanceOf(USER2.address)).to.equal(wei("100"));
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

      expect(await token.balanceOf(USER2.address)).to.equal(wei("0"));

      await token.mintTo(USER2.address, wei("100"));

      expect(await token.balanceOf(USER2.address)).to.equal(wei("100"));

      expect(await token.decimals()).to.be.equal(18);
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

      await expect(token.mintTo(USER2.address, wei("1000"))).to.be.revertedWith(
        "ERC20: The total supply capacity exceeded, minting is not allowed."
      );
    });

    it("should not be able to mint tokens due to permissions (1)", async () => {
      await deployERC20(DefaultERC20Params, OWNER);

      await expect(token.connect(USER1).mintTo(USER2.address, wei("100"))).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("burnFrom", () => {
    it("should be able to burn tokens", async () => {
      await deployERC20(DefaultERC20Params, OWNER);

      await token.mintTo(USER2.address, wei("100"));
      await token.connect(USER2).burnFrom(USER2.address, wei("100"));

      expect(await token.balanceOf(USER2.address)).to.equal(wei("0"));
    });

    it("should be able to burn approved tokens", async () => {
      await deployERC20(DefaultERC20Params, OWNER);

      await token.mintTo(USER2.address, wei("100"));

      expect(token.connect(USER1).burnFrom(USER2.address, wei("100"))).to.be.revertedWith(
        "ERC20: insufficient allowance"
      );

      await token.connect(USER2).approve(USER1.address, wei("100"));

      await token.connect(USER1).burnFrom(USER2.address, wei("100"));

      expect(await token.balanceOf(USER2.address)).to.equal(wei("0"));
    });

    it("should not burn tokens due to the permissions (1)", async () => {
      await deployERC20(DefaultERC20Params, OWNER);

      await token.mintTo(USER2.address, wei("100"));

      await expect(token.connect(USER1).burnFrom(USER2.address, wei("100"))).to.be.revertedWith(
        "ERC20: insufficient allowance"
      );
    });
  });

  describe("transfer", () => {
    it("should be able to transfer tokens", async () => {
      await deployERC20(DefaultERC20Params, OWNER);

      await token.mintTo(USER2.address, wei("100"));

      await token.connect(USER2).transfer(USER1.address, wei("10"));

      expect(await token.balanceOf(USER1.address)).to.equal(wei("10"));
    });

    it("should be able to transfer from tokens", async () => {
      await deployERC20(DefaultERC20Params, OWNER);

      await token.mintTo(USER2.address, wei("100"));

      await token.connect(USER2).approve(USER3.address, wei("20"));

      await token.connect(USER3).transferFrom(USER2.address, USER1.address, wei("20"));

      expect(await token.balanceOf(USER1.address)).to.equal(wei("20"));
    });
  });

  describe("setContractMetadata", () => {
    it("should set new contract metadata", async () => {
      await deployERC20(DefaultERC20Params, OWNER);

      expect(await token.contractURI()).to.equal(DefaultERC20Params.contractURI);

      await token.setContractMetadata("NEW_URI");

      expect(await token.contractURI()).to.equal("NEW_URI");
    });

    it("should not set contract metadata due to permissions", async () => {
      await deployERC20(DefaultERC20Params, OWNER);

      expect(token.connect(USER1).setContractMetadata("NEW_URI")).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });
});
