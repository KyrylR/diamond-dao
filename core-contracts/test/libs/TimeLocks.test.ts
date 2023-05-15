import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "bignumber.js";

import { toBN } from "@/scripts/utils/utils";

import { getCurrentBlockTime, setTime } from "../helpers/block-helper";

import { TimeLocksMock } from "@ethers-v5";

describe("TimeLocksMock", () => {
  let mock: TimeLocksMock;
  let lockTime: BigNumber;
  let lockTime2: BigNumber;

  beforeEach("setup", async () => {
    const TimeLocksMock = await ethers.getContractFactory("TimeLocksMock");
    mock = await TimeLocksMock.deploy();

    lockTime = toBN(await getCurrentBlockTime()).plus(1000);
    lockTime2 = lockTime.plus(1000);
  });

  it("should lock", async () => {
    expect(await mock.isAbleToWithdrawView(2000, 800)).to.be.true;
    await mock.isAbleToWithdraw(2000, 800);

    await mock.lock(1500, lockTime.toString());

    expect(await mock.isAbleToWithdrawView(2000, 800)).to.be.false;
    await expect(mock.isAbleToWithdraw(2000, 800)).to.be.revertedWithoutReason();

    expect(await mock.length()).to.equal(1);
    expect((await mock.topValue()).toString()).to.equal(lockTime.toString());

    await mock.lock(700, lockTime2.toString());

    expect(await mock.topValue()).to.equal(lockTime);

    expect(await mock.isAbleToWithdrawView(2000, 800)).to.be.false;
    await expect(mock.isAbleToWithdraw(2000, 800)).to.be.revertedWithoutReason();

    await setTime(lockTime.plus(1).toNumber());

    expect(await mock.isAbleToWithdrawView(2000, 800)).to.be.true;
    await mock.isAbleToWithdraw(2000, 800);
  });

  it("should purge time locks", async () => {
    await mock.purgeTimeLocks();

    expect(await mock.isAbleToWithdrawView(2000, 800)).to.be.true;

    await mock.lock(1500, lockTime.toString());
    await mock.lock(700, lockTime2.toString());

    expect(await mock.isAbleToWithdrawView(2000, 800)).to.be.false;

    await setTime(lockTime.plus(1).toNumber());

    expect(await mock.isAbleToWithdrawView(2000, 800)).to.be.true;

    await setTime(lockTime2.plus(1).toNumber());

    expect(await mock.isAbleToWithdrawView(2000, 800)).to.be.true;

    await mock.purgeTimeLocks();
  });

  it("should work currently in edge case", async () => {
    expect(await mock.isAbleToWithdrawView(2000, 800)).to.be.true;

    await mock.lock(1500, lockTime.toString());
    await mock.lock(1500, lockTime2.toString());

    expect(await mock.isAbleToWithdrawView(2000, 800)).to.be.false;

    await setTime(lockTime.plus(1).toNumber());

    expect(await mock.isAbleToWithdrawView(2000, 800)).to.be.false;

    await setTime(lockTime2.plus(1).toNumber());

    expect(await mock.isAbleToWithdrawView(2000, 800)).to.be.true;

    await mock.purgeTimeLocks();
  });
});
