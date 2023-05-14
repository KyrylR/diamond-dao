import { expect } from "chai";
import {ethers} from "hardhat";

const { getParameter, ParameterType } = require("../utils/constants");
const { cast } = require("../utils/caster");

const ParameterSetMock = artifacts.require("ParameterSetMock");

ParameterSetMock.numberFormat = "BigNumber";

describe("ParameterSetMock", () => {
  let mock;

  beforeEach("setup", async () => {
    mock = await ParameterSetMock.new();
  });

  describe("add()", () => {
    it("should add different Parameters twice", async () => {
      let expected1 = getParameter("test1", "string", ParameterType.STRING);
      let expected2 = getParameter("test2", "string", ParameterType.STRING);

      await mock.add(expected1);
      await mock.add(expected2);

      let set = await mock.getSet();

      assert.equal(set.length, 2);
      assert.deepEqual(cast(set[0]), expected1);
      assert.deepEqual(cast(set[1]), expected2);
    });

    it("should add empty Parameter", async () => {
      let expected = getParameter("", "", ParameterType.STRING);

      await mock.add(expected);

      let set = await mock.getSet();

      assert.equal(set.length, 1);
      assert.deepEqual(cast(set[0]), expected);
    });

    it("should add same Parameter twice", async () => {
      let expected = getParameter("test", "string", ParameterType.STRING);

      await mock.add(expected);
      await mock.add(expected);

      let set = await mock.getSet();

      assert.equal(set.length, 1);
      assert.deepEqual(cast(set[0]), expected);
    });
  });

  describe("change()", () => {
    it("should change Parameter", async () => {
      let expected = getParameter("test", "string", ParameterType.STRING);

      await mock.add(expected);
      expected.value = web3.eth.abi.encodeParameter(
        "bytes32",
        web3.utils.encodePacked({ value: "new value", type: "string" })
      );
      await mock.change(expected);

      let set = await mock.getSet();
      assert.equal(set.length, 1);
      assert.deepEqual(cast(set[0]), expected);
    });

    it("should change non-existent Parameter", async () => {
      let expected = getParameter("test", "string", ParameterType.STRING);

      await mock.change(expected);

      let set = await mock.getSet();
      assert.equal(set.length, 0);
    });
  });

  describe("remove()", () => {
    it("should remove Parameter", async () => {
      let expected = getParameter("test", "string", ParameterType.STRING);

      await mock.add(expected);
      await mock.remove(expected.name);

      let set = await mock.getSet();
      assert.equal(set.length, 0);
    });

    it("should call remove at empty set", async () => {
      let expected = getParameter("test", "string", ParameterType.STRING);

      await mock.remove(expected.name);

      let set = await mock.getSet();
      assert.equal(set.length, 0);
    });

    it("should remove non-existent Parameter", async () => {
      let expected = getParameter("test", "string", ParameterType.STRING);

      await mock.add(expected);
      await mock.remove("non-existent");

      let set = await mock.getSet();
      assert.equal(set.length, 1);
      assert.deepEqual(cast(set[0]), expected);
    });

    it("should remove from middle", async () => {
      let expected1 = getParameter("test1", "string", ParameterType.STRING);
      let expected2 = getParameter("test2", "string", ParameterType.STRING);
      let expected3 = getParameter("test3", "string", ParameterType.STRING);

      await mock.add(expected1);
      await mock.add(expected2);
      await mock.add(expected3);

      await mock.remove(expected2.name);

      let set = await mock.getSet();
      assert.equal(set.length, 2);
      assert.deepEqual(cast(set[0]), expected1);
      assert.deepEqual(cast(set[1]), expected3);
    });
  });

  describe("contains()", () => {
    it("should return true", async () => {
      let expected = getParameter("test", "string", ParameterType.STRING);

      await mock.add(expected);

      assert.isTrue(await mock.contains(expected.name));
    });

    it("should return false", async () => {
      let expected = getParameter("test", "string", ParameterType.STRING);

      assert.isFalse(await mock.contains(expected.name));
    });
  });

  describe("length()", () => {
    it("should return correct length", async () => {
      let expected = getParameter("test", "string", ParameterType.STRING);

      for (let i = 0; i < 10; i++) {
        expected.name = "test" + i;
        await mock.add(expected);
      }

      assert.equal(await mock.length(), 10);
    });
  });

  describe("at()", () => {
    it("should correctly return 10 values", async () => {
      let expected = getParameter("test", "string", ParameterType.STRING);

      for (let i = 0; i < 10; i++) {
        expected.name = "test" + i;
        await mock.add(expected);
      }

      for (let i = 0; i < 10; i++) {
        expected.name = "test" + i;
        assert.deepEqual(cast(await mock.at(i)), expected);
      }
    });
  });

  describe("get()", () => {
    it("should correctly return 10 values", async () => {
      let expected = getParameter("test", "string", ParameterType.STRING);

      for (let i = 0; i < 10; i++) {
        expected.name = "test" + i;
        await mock.add(expected);
      }

      for (let i = 0; i < 10; i++) {
        expected.name = "test" + i;
        assert.deepEqual(cast(await mock.get(expected.name)), expected);
      }
    });
  });

  describe("values", () => {
    it("should return all values", async () => {
      let expected = getParameter("test", "string", ParameterType.STRING);

      for (let i = 0; i < 10; i++) {
        expected.name = "test" + i;
        await mock.add(expected);
      }

      let values = await mock.values();
      assert.equal(values.length, 10);
      for (let i = 0; i < 10; i++) {
        expected.name = "test" + i;
        assert.deepEqual(cast(values[i]), expected);
      }
    });
  });
});
