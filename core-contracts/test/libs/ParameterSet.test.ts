import { expect } from "chai";
import { ethers } from "hardhat";

import { getParameter, ParameterType } from "../utils/constants";

import { cast } from "@/test/utils/caster";

import { ParameterSetMock } from "@ethers-v5";

describe("ParameterSetMock", () => {
  let mock: ParameterSetMock;

  beforeEach("setup", async () => {
    const ParameterSetMock = await ethers.getContractFactory("ParameterSetMock");
    mock = await ParameterSetMock.deploy();
  });

  describe("add()", () => {
    it("should add different Parameters twice", async () => {
      let expected1 = getParameter("test1", "string", ParameterType.STRING);
      let expected2 = getParameter("test2", "string", ParameterType.STRING);

      await mock.add(expected1);
      await mock.add(expected2);

      let set = await mock.getSet();

      expect(set.length).to.equal(2);
      expect(cast(set[0])).to.deep.equal(expected1);
      expect(cast(set[1])).to.deep.equal(expected2);
    });

    it("should add empty Parameter", async () => {
      let expected = getParameter("", "", ParameterType.STRING);

      await mock.add(expected);

      let set = await mock.getSet();

      expect(set.length).to.equal(1);
      expect(cast(set[0])).to.deep.equal(expected);
    });

    it("should add same Parameter twice", async () => {
      let expected = getParameter("test", "string", ParameterType.STRING);

      await mock.add(expected);
      await mock.add(expected);

      let set = await mock.getSet();

      expect(set.length).to.equal(1);
      expect(cast(set[0])).to.deep.equal(expected);
    });
  });

  describe("change()", () => {
    it("should change Parameter", async () => {
      let expected = getParameter("test", "string", ParameterType.STRING);

      await mock.add(expected);
      const coder = new ethers.utils.AbiCoder();
      expected.value = coder.encode(["string"], ["new value"]);
      await mock.change(expected);

      let set = await mock.getSet();
      expect(set.length).to.equal(1);
      expect(cast(set[0])).to.deep.equal(expected);
    });

    it("should change non-existent Parameter", async () => {
      let expected = getParameter("test", "string", ParameterType.STRING);

      await mock.change(expected);

      let set = await mock.getSet();
      expect(set.length).to.equal(0);
    });
  });

  describe("remove()", () => {
    it("should remove Parameter", async () => {
      let expected = getParameter("test", "string", ParameterType.STRING);

      await mock.add(expected);
      await mock.remove(expected.name);

      let set = await mock.getSet();
      expect(set.length).to.equal(0);
    });

    it("should call remove at empty set", async () => {
      let expected = getParameter("test", "string", ParameterType.STRING);

      await mock.remove(expected.name);

      let set = await mock.getSet();
      expect(set.length).to.equal(0);
    });

    it("should remove non-existent Parameter", async () => {
      let expected = getParameter("test", "string", ParameterType.STRING);

      await mock.add(expected);
      await mock.remove("non-existent");

      let set = await mock.getSet();
      expect(set.length).to.equal(1);
      expect(cast(set[0])).to.deep.equal(expected);
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
      expect(set.length).to.equal(2);
      expect(cast(set[0])).to.deep.equal(expected1);
      expect(cast(set[1])).to.deep.equal(expected3);
    });
  });

  describe("contains()", () => {
    it("should return true", async () => {
      let expected = getParameter("test", "string", ParameterType.STRING);

      await mock.add(expected);

      expect(await mock.contains(expected.name)).to.be.true;
    });

    it("should return false", async () => {
      let expected = getParameter("test", "string", ParameterType.STRING);

      expect(await mock.contains(expected.name)).to.be.false;
    });
  });

  describe("length()", () => {
    it("should return correct length", async () => {
      let expected = getParameter("test", "string", ParameterType.STRING);

      for (let i = 0; i < 10; i++) {
        expected.name = "test" + i;
        await mock.add(expected);
      }

      expect(await mock.length()).to.equal(10);
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
        expect(cast(await mock.at(i))).to.deep.equal(expected);
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
        expect(cast(await mock.get(expected.name))).to.deep.equal(expected);
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
      expect(values.length).to.equal(10);
      for (let i = 0; i < 10; i++) {
        expected.name = "test" + i;
        expect(cast(values[i])).to.deep.equal(expected);
      }
    });
  });
});
