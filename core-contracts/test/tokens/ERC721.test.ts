import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { Reverter } from "@/test/helpers/reverter";

import { DefaultERC721Params } from "../utils/constants";

import { ERC721Extended } from "@ethers-v5";

describe("ERC721", async () => {
  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let USER1: SignerWithAddress;
  let USER2: SignerWithAddress;
  let USER3: SignerWithAddress;

  const ERC721Resource = "ERC721";

  let token: ERC721Extended;

  before("setup", async () => {
    [OWNER, USER1, USER2, USER3] = await ethers.getSigners();

    await reverter.snapshot();
  });

  afterEach("revert", reverter.revert);

  async function deployERC721(params: any, master: SignerWithAddress) {
    const ERC721Extended = await ethers.getContractFactory("ERC721Extended");
    token = await ERC721Extended.deploy();

    await token.connect(master).__ERC721_init(params, ERC721Resource);
  }

  describe("access", () => {
    beforeEach("setup", async () => {
      await deployERC721(DefaultERC721Params, OWNER);
    });

    it("should not initialize twice", async () => {
      expect(token.__ERC721_init(DefaultERC721Params, ERC721Resource)).to.be.revertedWith(
        "Initializable: contract is already initialized"
      );
    });
  });

  describe("mintTo", () => {
    it("should be able to mint tokens", async () => {
      await deployERC721(DefaultERC721Params, OWNER);

      expect(await token.balanceOf(USER2.address)).to.equal(0);

      await token.mintTo(USER2.address, 1, "_1");

      expect(await token.balanceOf(USER2.address)).to.equal(1);
      expect(await token.tokenOfOwnerByIndex(USER2.address, 0)).to.equal(1);

      expect(await token.tokenURI(1)).to.equal("BASE_URI_1");
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

      expect(await token.balanceOf(USER2.address)).to.equal(0);

      await token.mintTo(USER2.address, 1, "1");
      await token.mintTo(USER2.address, 3, "3");

      expect(await token.balanceOf(USER2.address)).to.equal(2);
      expect(await token.tokenOfOwnerByIndex(USER2.address, 0)).to.equal(1);
      expect(await token.tokenOfOwnerByIndex(USER2.address, 1)).to.equal(3);

      expect(await token.tokenURI(1)).to.equal("1");
      expect(await token.tokenURI(3)).to.equal("3");
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

      await token.mintTo(USER2.address, 2, "2");

      await expect(token.mintTo(USER2.address, 3, "3")).to.be.revertedWith(
        "ERC721: The total supply capacity exceeded, minting is not allowed."
      );
    });

    it("should not be able to mint tokens due to permissions (1)", async () => {
      await deployERC721(DefaultERC721Params, OWNER);

      await expect(token.connect(USER1).mintTo(USER2.address, 1, "1")).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("burnFrom", () => {
    it("should be able to burn tokens", async () => {
      await deployERC721(DefaultERC721Params, OWNER);

      await token.mintTo(USER2.address, 1, "1");
      await token.connect(USER2).burnFrom(USER2.address, 1);

      expect(await token.balanceOf(USER2.address)).to.equal(0);

      await expect(token.tokenURI(1)).to.be.revertedWith("ERC721: invalid token ID");
    });

    it("should be able to burn approved token", async () => {
      await deployERC721(DefaultERC721Params, OWNER);

      await token.mintTo(USER2.address, 1, "1");

      await expect(token.connect(USER1).burnFrom(USER2.address, 1)).to.be.revertedWith(
        "ERC721: Burn not approved by the owner of the NFT."
      );

      await token.connect(USER2).approve(USER1.address, 1);

      await token.connect(USER1).burnFrom(USER2.address, 1);

      expect(await token.balanceOf(USER2.address)).to.equal(0);
    });

    it("should be able to burn approvedAll tokens", async () => {
      await deployERC721(DefaultERC721Params, OWNER);

      await token.mintTo(USER2.address, 1, "1");

      await expect(token.connect(USER1).burnFrom(USER2.address, 1)).to.be.revertedWith(
        "ERC721: Burn not approved by the owner of the NFT."
      );

      await token.connect(USER2).setApprovalForAll(USER1.address, true);

      await token.connect(USER1).burnFrom(USER2.address, 1);

      expect(await token.balanceOf(USER2.address)).to.equal(0);
    });

    it("should not burn tokens due to the permissions (1)", async () => {
      await deployERC721(DefaultERC721Params, OWNER);

      await token.mintTo(USER2.address, 1, "1");

      await expect(token.connect(USER1).burnFrom(USER2.address, 1)).to.be.revertedWith(
        "ERC721: Burn not approved by the owner of the NFT."
      );
    });
  });

  describe("transfer", () => {
    it("should be able to transfer tokens", async () => {
      await deployERC721(DefaultERC721Params, OWNER);

      await token.mintTo(USER2.address, 1, "1");

      await token.connect(USER2).transferFrom(USER2.address, USER1.address, 1);

      expect(await token.balanceOf(USER1.address)).to.equal(1);
      expect(await token.tokenOfOwnerByIndex(USER1.address, 0)).to.equal(1);
    });

    it("should be able to transfer from tokens", async () => {
      await deployERC721(DefaultERC721Params, OWNER);

      await token.mintTo(USER2.address, 1, "1");

      await token.connect(USER2).approve(USER3.address, 1);

      await token.connect(USER3).transferFrom(USER2.address, USER1.address, 1);

      expect(await token.balanceOf(USER1.address)).to.equal(1);
      expect(await token.tokenOfOwnerByIndex(USER1.address, 0)).to.equal(1);
    });
  });

  describe("setContractMetadata", () => {
    it("should set new contract metadata", async () => {
      await deployERC721(DefaultERC721Params, OWNER);

      expect(await token.contractURI()).to.equal(DefaultERC721Params.contractURI);

      await token.setContractMetadata("NEW_URI");

      expect(await token.contractURI()).to.equal("NEW_URI");
    });

    it("should not set contract metadata due to permissions", async () => {
      await deployERC721(DefaultERC721Params, OWNER);

      await expect(token.connect(USER1).setContractMetadata("NEW_URI")).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("setBaseURI", () => {
    it("should set new base uri", async () => {
      await deployERC721(DefaultERC721Params, OWNER);

      expect(await token.baseURI(), DefaultERC721Params.baseURI);

      await token.setBaseURI("NEW_BASE_URI");

      expect(await token.baseURI(), "NEW_BASE_URI");
    });

    it("should not set base uri due to permissions", async () => {
      await deployERC721(DefaultERC721Params, OWNER);

      await expect(token.connect(USER1).setBaseURI("NEW_BASE_URI")).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("setTokenURI", () => {
    beforeEach("setup", async () => {
      await deployERC721(DefaultERC721Params, OWNER);

      await token.mintTo(USER1.address, 1, "1");
    });

    it("should set new token uri", async () => {
      expect(await token.tokenURI(1)).to.equal("BASE_URI1");

      await token.connect(USER1).setTokenURI(1, "_1");

      expect(await token.tokenURI(1)).to.equal("BASE_URI_1");
    });

    it("should not set token uri due to permissions", async () => {
      await expect(token.connect(USER2).setTokenURI(1, "_1")).to.be.revertedWith(
        "ERC721: Set token URI not approved by the owner of the NFT."
      );
    });

    it("should be able to set token uri if approved", async () => {
      await expect(token.connect(USER2).setTokenURI(1, "_TOKEN_URI_1")).to.be.revertedWith(
        "ERC721: Set token URI not approved by the owner of the NFT."
      );

      await token.connect(USER1).approve(USER2.address, 1);

      await token.connect(USER2).setTokenURI(1, "_TOKEN_URI_1");

      expect(await token.tokenURI(1)).to.equal("BASE_URI_TOKEN_URI_1");
    });

    it("should be able to set token uri if approvedAll", async () => {
      await expect(token.connect(USER2).setTokenURI(1, "_TOKEN_URI_1")).to.be.revertedWith(
        "ERC721: Set token URI not approved by the owner of the NFT."
      );

      await token.connect(USER1).setApprovalForAll(USER2.address, true);

      await token.connect(USER2).setTokenURI(1, "_TOKEN_URI_1");

      expect(await token.tokenURI(1)).to.equal("BASE_URI_TOKEN_URI_1");
    });
  });

  describe("supportsInterface", () => {
    it("should support interfaces", async () => {
      await deployERC721(DefaultERC721Params, OWNER);

      // IERC721 and IERC721Upgradeable - 0x80ac58cd
      expect(await token.supportsInterface("0x80ac58cd")).to.be.true;

      // IERC721Enumerable and IERC721EnumerableUpgradeable - 0x780e9d63
      expect(await token.supportsInterface("0x780e9d63")).to.be.true;

      // IERC721 - 0xa57a25b8
      expect(await token.supportsInterface("0xa57a25b8")).to.be.true;
    });
  });
});
