import { expect } from "chai";
import { ethers } from "hardhat";

import { getParameter, ParameterType } from "../utils/constants";

import { cast } from "@/test/utils/caster";
import { accounts } from "@/scripts/utils/utils";

import { ParameterCodecMock  } from "@ethers-v5";

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
    mock = await ParameterCodecMock.new();

    test_address = getParameter("test_address", await accounts(1), ParameterType.ADDRESS);
    test_bytes.solidityType = 4;
  });

  describe("decode", () => {
    it("should decode uint256", async () => {
      const result = await mock.decodeUint256(test_uint256);
      assert.equal(result, 1);

      await truffleAssert.reverts(mock.decodeUint256(test_bytes), `InvalidParameterType("test_bytes", 2, 4)`);
    });

    it("should decode bytes", async () => {
      const result = await mock.decodeBytes(test_bytes);
      const expected = getParameter(
        "test_bytes",
        "0x1234567890123456789012345678901234567890123456789012345678901234",
        ParameterType.BYTES
      );
      assert.equal(result, expected.value);

      await truffleAssert.reverts(mock.decodeBytes(test_uint256), `InvalidParameterType("test_uint256", 4, 2)`);
    });

    it("should decode string", async () => {
      const result = await mock.decodeString(test_string);
      assert.equal(result.replaceAll(`\0`, ""), "Hello World!");

      await truffleAssert.reverts(mock.decodeString(test_uint256), `InvalidParameterType("test_uint256", 3, 2)`);
    });

    it("should decode bool", async () => {
      const result = await mock.decodeBool(test_bool);
      assert.equal(result, true);

      await truffleAssert.reverts(mock.decodeBool(test_uint256), `InvalidParameterType("test_uint256", 5, 2)`);
    });

    it("should decode address", async () => {
      const result = await mock.decodeAddress(test_address);
      assert.equal(result, await accounts(1));

      await truffleAssert.reverts(mock.decodeAddress(test_uint256), `InvalidParameterType("test_uint256", 1, 2)`);
    });
  });

  describe("encode", () => {
    it("should encode uint256", async () => {
      const result = await mock.encodeUint256(1, "test_uint256");
      assert.deepEqual(cast(result), getParameter("test_uint256", 1, ParameterType.UINT256));
    });

    it("should encode bytes32", async () => {
      const result = await mock.encodeBytes(
        "0x1234567890123456789012345678901234567890123456789012345678901234",
        "test_bytes"
      );
      assert.deepEqual(
        cast(result),
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
      assert.deepEqual(
        cast(result),
        getParameter(
          "test_string",
          "Hello World!aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          ParameterType.STRING
        )
      );
    });

    it("should encode bool", async () => {
      const result = await mock.encodeBool(true, "test_bool");
      assert.deepEqual(cast(result), getParameter("test_bool", true, ParameterType.BOOL));
    });

    it("should encode address", async () => {
      const result = await mock.encodeAddress(await accounts(1), "test_address");
      assert.deepEqual(cast(result), getParameter("test_address", await accounts(1), ParameterType.ADDRESS));
    });
  });
});
