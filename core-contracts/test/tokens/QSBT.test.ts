import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { Reverter } from "@/test/helpers/reverter";

import { DefaultSBTParams } from "../utils/constants";

import { SBT } from "@ethers-v5";

describe("SBT", async () => {
  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let USER1: SignerWithAddress;
  let USER2: SignerWithAddress;
  let USER3: SignerWithAddress;

  const SBTResource = "SBT";

  let token: SBT;

  before("setup", async () => {
    [OWNER, USER1, USER2, USER3] = await ethers.getSigners();

    await reverter.snapshot();
  });

  afterEach("revert", reverter.revert);

  async function deploySBT(params: any, master: SignerWithAddress) {
    const SBT = await ethers.getContractFactory("SBT");
    token = await SBT.deploy();

    await token.connect(master).__SBT_init(params, SBTResource);
  }

  describe("access", () => {
    beforeEach("setup", async () => {
      await deploySBT(DefaultSBTParams, OWNER);
    });

    it("should not initialize twice", async () => {
      await expect(token.__SBT_init(DefaultSBTParams, SBTResource)).to.be.revertedWith(
        "Initializable: contract is already initialized"
      );
    });
  });

  describe("mintTo", () => {
    it("should be able to mint tokens", async () => {
      await deploySBT(DefaultSBTParams, OWNER);

      expect(await token.balanceOf(USER2.address)).to.be.equal("0");

      await token.mintTo(USER2.address, 1, "_1", 3);

      expect(await token.burnAuth(1)).to.be.equal(3);

      expect(await token.balanceOf(USER2.address)).to.be.equal("1");
      expect(await token.tokenOfOwnerByIndex(USER2.address, 0)).to.be.equal("1");

      expect(await token.tokenURI(1)).to.be.equal("BASE_URI_1");
    });

    it("should be able to mint capped tokens", async () => {
      const tokenParams = {
        name: "name",
        symbol: "symbol",
        contractURI: "URI",
        baseURI: "",
        totalSupplyCap: 2,
      };

      await deploySBT(tokenParams, OWNER);

      expect(await token.balanceOf(USER2.address)).to.be.equal("0");

      await token.mintTo(USER2.address, 1, "1", 3);

      await expect(token.mintTo(USER2.address, 3, "3", 3)).to.be.revertedWith("SBT: The user already has a SBT.");

      await token.mintTo(USER1.address, 3, "3", 3);

      expect(await token.balanceOf(USER2.address)).to.be.equal("1");
      expect(await token.tokenOfOwnerByIndex(USER2.address, 0)).to.be.equal("1");
      expect(await token.tokenOfOwnerByIndex(USER1.address, 0)).to.be.equal("3");

      expect(await token.tokenURI(1)).to.be.equal("1");
      expect(await token.tokenURI(3)).to.be.equal("3");
    });

    it("should not exceed the cap", async () => {
      const tokenParams = {
        name: "name",
        symbol: "symbol",
        contractURI: "URI",
        baseURI: "",
        totalSupplyCap: 1,
      };

      await deploySBT(tokenParams, OWNER);

      await token.mintTo(USER2.address, 2, "2", 3);

      await expect(token.mintTo(USER1.address, 3, "3", 3)).to.be.revertedWith(
        "SBT: The total supply capacity exceeded, minting is not allowed."
      );
    });

    it("should not be able to mint tokens due to permissions (1)", async () => {
      await deploySBT(DefaultSBTParams, OWNER);

      await expect(token.connect(USER1).mintTo(USER2.address, 1, "1", 3)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("burn", () => {
    it("should be able to burn tokens with BurnAuth: Both, OwnerOnly and IssuerOnly", async () => {
      await deploySBT(DefaultSBTParams, OWNER);

      // ====== IssuerOnly ======
      await token.mintTo(USER2.address, 1, "1", 0);
      await expect(token.connect(USER2).burn(1)).to.be.revertedWith("SBT: Burn not authorized.");
      expect(await token.isAbleToBurn(OWNER.address, 1)).to.be.true;
      expect(await token.isAbleToBurn(USER2.address, 1)).to.be.false;
      await token.burn(1);
      // ==================

      // ====== OwnerOnly ======
      await token.mintTo(USER2.address, 1, "1", 1);
      await expect(token.burn(1)).to.be.revertedWith("SBT: Burn not authorized.");
      expect(await token.isAbleToBurn(OWNER.address, 1)).to.be.false;
      expect(await token.isAbleToBurn(USER2.address, 1)).to.be.true;
      await token.connect(USER2).burn(1);
      // ==================

      // ====== Both ======
      await token.mintTo(USER2.address, 1, "1", 2);
      await token.burn(1);
      await token.mintTo(USER2.address, 1, "1", 2);
      expect(await token.isAbleToBurn(OWNER.address, 1)).to.be.true;
      expect(await token.isAbleToBurn(USER2.address, 1)).to.be.true;
      await token.connect(USER2).burn(1);
      // ==================

      expect(await token.balanceOf(USER2.address)).to.be.equal("0");

      await expect(token.tokenURI(1)).to.be.revertedWith("ERC721: invalid token ID");
    });

    it("should be able to burn approved token", async () => {
      await deploySBT(DefaultSBTParams, OWNER);

      await token.mintTo(USER2.address, 1, "1", 1);

      await expect(token.connect(USER1).burn(1)).to.be.revertedWith("SBT: Burn not authorized.");

      await token.connect(USER2).approve(USER1.address, 1);

      await token.connect(USER1).burn(1);

      expect(await token.balanceOf(USER2.address)).to.be.equal("0");
    });

    it("should be able to burn approvedAll tokens", async () => {
      await deploySBT(DefaultSBTParams, OWNER);

      await token.mintTo(USER2.address, 1, "1", 1);

      await expect(token.connect(USER1).burn(1)).to.be.revertedWith("SBT: Burn not authorized.");

      await token.connect(USER2).setApprovalForAll(USER1.address, true);

      await token.connect(USER1).burn(1);

      expect(await token.balanceOf(USER2.address)).to.be.equal("0");
    });

    it("should not burn tokens due to the permissions (1)", async () => {
      await deploySBT(DefaultSBTParams, OWNER);

      await token.mintTo(USER2.address, 1, "1", 3);

      await expect(token.connect(USER1).burn(1)).to.be.revertedWith("SBT: Burn not authorized.");
    });
  });

  describe("transfer", () => {
    it("should not be able to transfer tokens", async () => {
      await deploySBT(DefaultSBTParams, OWNER);

      await token.mintTo(USER2.address, 1, "1", 3);

      await expect(token.connect(USER2).transferFrom(USER2.address, USER1.address, 1)).to.be.revertedWith(
        "SBT: Not transferable."
      );

      expect(await token.balanceOf(USER1.address)).to.be.equal("0");
    });
  });

  describe("setContractMetadata", () => {
    it("should set new contract metadata", async () => {
      await deploySBT(DefaultSBTParams, OWNER);

      expect(await token.contractURI()).to.be.equal(DefaultSBTParams.contractURI);

      await token.setContractMetadata("NEW_URI");

      expect(await token.contractURI()).to.be.equal("NEW_URI");
    });

    it("should not set contract metadata due to permissions", async () => {
      await deploySBT(DefaultSBTParams, OWNER);

      await expect(token.connect(USER1).setContractMetadata("NEW_URI")).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("setBaseURI", () => {
    it("should set new base uri", async () => {
      await deploySBT(DefaultSBTParams, OWNER);

      expect(await token.baseURI()).to.be.equal(DefaultSBTParams.baseURI);

      await token.setBaseURI("NEW_BASE_URI");

      expect(await token.baseURI()).to.be.equal("NEW_BASE_URI");
    });

    it("should not set base uri due to permissions", async () => {
      await deploySBT(DefaultSBTParams, OWNER);

      await expect(token.connect(USER1).setBaseURI("NEW_BASE_URI")).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("setTokenURI", () => {
    beforeEach("setup", async () => {
      await deploySBT(DefaultSBTParams, OWNER);

      await token.mintTo(USER1.address, 1, "1", 3);
    });

    it("should set new token uri", async () => {
      expect(await token.tokenURI(1)).to.be.equal("BASE_URI1");

      await token.connect(USER1).setTokenURI(1, "_1");

      expect(await token.tokenURI(1)).to.be.equal("BASE_URI_1");
    });

    it("should not set token uri due to permissions", async () => {
      await expect(token.connect(USER2).setTokenURI(1, "_1")).to.be.revertedWith(
        "SBT: Set token URI not approved by the owner of the SBT."
      );
    });

    it("should be able to set token uri if approved", async () => {
      await expect(token.connect(USER2).setTokenURI(1, "_TOKEN_URI_1")).to.be.revertedWith(
        "SBT: Set token URI not approved by the owner of the SBT."
      );

      await token.connect(USER1).approve(USER2.address, 1);

      await token.connect(USER2).setTokenURI(1, "_TOKEN_URI_1");

      expect(await token.tokenURI(1)).to.be.equal("BASE_URI_TOKEN_URI_1");
    });

    it("should be able to set token uri if approvedAll", async () => {
      await expect(token.connect(USER2).setTokenURI(1, "_TOKEN_URI_1")).to.be.revertedWith(
        "SBT: Set token URI not approved by the owner of the SBT."
      );

      await token.connect(USER1).setApprovalForAll(USER2.address, true);

      await token.connect(USER2).setTokenURI(1, "_TOKEN_URI_1");

      expect(await token.tokenURI(1)).to.be.equal("BASE_URI_TOKEN_URI_1");
    });
  });

  describe("supportsInterface", () => {
    it("should support interfaces", async () => {
      await deploySBT(DefaultSBTParams, OWNER);

      // ISBT - 0xd1406bcb
      expect(await token.supportsInterface("0xd1406bcb")).to.be.true;

      // ERC5484 - 0x0489b56f
      expect(await token.supportsInterface("0x0489b56f")).to.be.true;

      // IERC721 and IERC721Upgradeable - 0x80ac58cd
      expect(await token.supportsInterface("0x80ac58cd")).to.be.true;

      // IERC721Enumerable and IERC721EnumerableUpgradeable - 0x780e9d63
      expect(await token.supportsInterface("0x780e9d63")).to.be.true;
    });
  });
});
