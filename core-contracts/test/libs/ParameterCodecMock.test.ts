import { expect } from "chai";
import { ethers } from "hardhat";

import { getParameter, ParameterType } from "../utils/constants";

import { cast } from "@/test/utils/caster";
import { accounts } from "@/scripts/utils/utils";

import { ParameterCodecMock } from "@ethers-v5";

describe("ParameterCodecMock", () => {
  let mock: ParameterCodecMock;

  const test_uint256 = getParameter("test_uint256", 1, ParameterType.UINT256);
  const test_bytes = getParameter(
    "test_bytes",
    "0x1234567890123456789012345678901234567890123456789012345678901234",
    ParameterType.BYTES
  );
  const test_string = getParameter("test_string", "Hello World!", ParameterType.STRING);
  const test_bool = getParameter("test_bool", true, ParameterType.BOOL);

  let test_address: any;

  beforeEach("setup", async () => {
    const ParameterCodecMock = await ethers.getContractFactory("ParameterCodecMock");
    mock = await ParameterCodecMock.deploy();

    test_address = getParameter("test_address", (await accounts(1)).address, ParameterType.ADDRESS);
    test_bytes.solidityType = 4;
  });

  describe("decode", () => {
    it("should decode uint256", async () => {
      const result = await mock.decodeUint256(test_uint256);

      expect(result).to.equal(1);

      expect(mock.decodeUint256(test_bytes))
        .to.be.revertedWithCustomError(mock, `InvalidParameterType`)
        .withArgs("test_bytes", 2, 4);
    });

    it("should decode bytes", async () => {
      const result = await mock.decodeBytes(test_bytes);
      const expected = getParameter(
        "test_bytes",
        "0x1234567890123456789012345678901234567890123456789012345678901234",
        ParameterType.BYTES
      );

      expect(result).to.equal(expected.value);

      await expect(mock.decodeBytes(test_uint256))
        .to.be.revertedWithCustomError(mock, `InvalidParameterType`)
        .withArgs("test_uint256", 4, 2);
    });

    it("should decode string", async () => {
      const result = await mock.decodeString(test_string);

      expect(result.replace(`\0`, "")).to.equal("Hello World!");

      await expect(mock.decodeString(test_uint256))
        .to.be.revertedWithCustomError(mock, `InvalidParameterType`)
        .withArgs("test_uint256", 3, 2);
    });

    it("should decode bool", async () => {
      const result = await mock.decodeBool(test_bool);

      expect(result).to.equal(true);

      await expect(mock.decodeBool(test_uint256))
        .to.be.revertedWithCustomError(mock, `InvalidParameterType`)
        .withArgs("test_uint256", 5, 2);
    });

    it("should decode address", async () => {
      const result = await mock.decodeAddress(test_address);

      expect(result).to.equal((await accounts(1)).address);

      await expect(mock.decodeAddress(test_uint256))
        .to.be.revertedWithCustomError(mock, `InvalidParameterType`)
        .withArgs("test_uint256", 1, 2);
    });
  });

  describe("encode", () => {
    it("should encode uint256", async () => {
      const result = await mock.encodeUint256(1, "test_uint256");

      expect(cast(result)).to.be.deep.equal(getParameter("test_uint256", 1, ParameterType.UINT256));
    });

    it("should encode bytes32", async () => {
      const result = await mock.encodeBytes(
        "0x1234567890123456789012345678901234567890123456789012345678901234",
        "test_bytes"
      );

      expect(cast(result)).to.be.deep.equal(
        getParameter(
          "test_bytes",
          "0x1234567890123456789012345678901234567890123456789012345678901234",
          ParameterType.BYTES
        )
      );
    });

    it("should encode string", async () => {
      const result = await mock.encodeString(
        "Hello World!aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "test_string"
      );

      expect(cast(result)).to.be.deep.equal(
        getParameter(
          "test_string",
          "Hello World!aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          ParameterType.STRING
        )
      );
    });

    it("should encode bool", async () => {
      const result = await mock.encodeBool(true, "test_bool");

      expect(cast(result)).to.be.deep.equal(getParameter("test_bool", true, ParameterType.BOOL));
    });

    it("should encode address", async () => {
      const result = await mock.encodeAddress((await accounts(1)).address, "test_address");

      expect(cast(result)).to.be.deep.equal(
        getParameter("test_address", (await accounts(1)).address, ParameterType.ADDRESS)
      );
    });
  });
});
