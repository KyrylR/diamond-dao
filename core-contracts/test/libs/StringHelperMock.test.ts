import { expect } from "chai";
import {ethers} from "hardhat";

import { StringHelperMock  } from "@ethers-v5";

describe("StringHelperMock", () => {
  let mock: StringHelperMock;

  beforeEach("setup", async () => {
    const StringHelperMock = await ethers.getContractFactory("StringHelperMock");
    mock = await StringHelperMock.deploy();
  });

  describe("should pass tests", () => {
    it("should be equal for same strings", async () => {
      expect(await mock.equalStrings()).to.be.true;
    });

    it("should be different for different strings with different length", async () => {
      expect(await mock.diffStringsWithDiffLength()).to.be.false;
    });

    it("should be different for different strings with same length", async () => {
      expect(await mock.diffStringsWithSameLength()).to.be.true;
    });
  });
});
