import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { Reverter } from "@/test/helpers/reverter";
import { wei } from "@/scripts/utils/utils";

import { getParameter, ParameterType } from "../utils/constants";

import { cast } from "@/test/utils/caster";
import { accounts } from "@/scripts/utils/utils";

import { ContractMetadata  } from "@ethers-v5";

describe("ContractMetadata", () => {
  const reverter = new Reverter();

  let contractMetadata: ContractMetadata;

  before("setup", async () => {
    contractMetadata = await ContractMetadata.new();

    await reverter.snapshot();
  });

  afterEach("revert", reverter.revert);

  describe("access", () => {
    it("should not initialize", async () => {
      await truffleAssert.reverts(contractMetadata.init(""), "Initializable: contract is not initializing");
    });
  });

  describe("setContractMetadata", () => {
    it("should set contract metadata", async () => {
      await contractMetadata.setContractMetadata("METADATA");

      assert.equal(await contractMetadata.contractURI(), "METADATA");
    });
  });
});
