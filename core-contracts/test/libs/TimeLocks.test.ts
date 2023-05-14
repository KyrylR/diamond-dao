import { expect } from "chai";
import { ethers } from "hardhat";
import {BigNumber} from "bignumber.js";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { Reverter } from "@/test/helpers/reverter";
import { toBN } from "@/scripts/utils/utils";

import { getCurrentBlockTime, setTime } from "../helpers/block-helper";

import { TimeLocksMock  } from "@ethers-v5";

describe("TimeLocksMock", () => {
  let mock: TimeLocksMock;
  let lockTime: BigNumber;
  let lockTime2: BigNumber;

  beforeEach("setup", async () => {
    mock = await TimeLocksMock.new();

    lockTime = toBN(await getCurrentBlockTime()).plus(1000);
    lockTime2 = lockTime.plus(1000);
  });

  it("should lock", async () => {
    assert.isTrue(await mock.isAbleToWithdrawView(2000, 800));
    await truffleAssert.passes(mock.isAbleToWithdraw(2000, 800));

    await mock.lock(1500, lockTime);

    assert.isFalse(await mock.isAbleToWithdrawView(2000, 800));
    await truffleAssert.reverts(mock.isAbleToWithdraw(2000, 800));
    assert.equal(await mock.length(), 1);
    assert.equal((await mock.topValue()).toString(), lockTime.toString());

    await mock.lock(700, lockTime2);

    assert.equal((await mock.topValue()).toString(), lockTime.toString());

    assert.isFalse(await mock.isAbleToWithdrawView(2000, 800));
    await truffleAssert.reverts(mock.isAbleToWithdraw(2000, 800));

    await setTime(lockTime.plus(1).toNumber());

    assert.isTrue(await mock.isAbleToWithdrawView(2000, 800));
    await truffleAssert.passes(mock.isAbleToWithdraw(2000, 800));
  });

  it("should purge time locks", async () => {
    truffleAssert.passes(mock.purgeTimeLocks(), "passes");

    assert.isTrue(await mock.isAbleToWithdrawView(2000, 800));

    await mock.lock(1500, lockTime);
    await mock.lock(700, lockTime2);

    assert.isFalse(await mock.isAbleToWithdrawView(2000, 800));

    await setTime(lockTime.plus(1).toNumber());

    assert.isTrue(await mock.isAbleToWithdrawView(2000, 800));

    await setTime(lockTime2.plus(1).toNumber());

    assert.isTrue(await mock.isAbleToWithdrawView(2000, 800));

    truffleAssert.passes(mock.purgeTimeLocks(), "passes");
  });

  it("should work currently in edge case", async () => {
    assert.isTrue(await mock.isAbleToWithdrawView(2000, 800));

    await mock.lock(1500, lockTime);
    await mock.lock(1500, lockTime2);

    assert.isFalse(await mock.isAbleToWithdrawView(2000, 800));

    await setTime(lockTime.plus(1).toNumber());

    assert.isFalse(await mock.isAbleToWithdrawView(2000, 800));

    await setTime(lockTime2.plus(1).toNumber());

    assert.isTrue(await mock.isAbleToWithdrawView(2000, 800));

    truffleAssert.passes(mock.purgeTimeLocks(), "passes");
  });
});
