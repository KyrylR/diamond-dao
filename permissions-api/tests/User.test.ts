import {
  assert,
  afterEach,
  clearStore,
  describe,
  newMockEvent,
  test,
} from "matchstick-as";
import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";

import { onDeposit, onWithdraw } from "../src/mappings/daoVault";

import {
  TokensDeposited,
  TokensWithdrew,
} from "../generated/DAOVault/DAOVault";

import { getBlock, getTransaction } from "./utils";

function createDepositEvent(
  tokenAddress: Address,
  sender: Address,
  amount: BigInt,
  block: ethereum.Block,
  tx: ethereum.Transaction
): TokensDeposited {
  // @ts-ignore
  let event = changetype<TokensDeposited>(newMockEvent());
  event.parameters = new Array();

  event.parameters.push(
    new ethereum.EventParam(
      "tokenAddress",
      ethereum.Value.fromAddress(tokenAddress)
    )
  );
  event.parameters.push(
    new ethereum.EventParam("sender", ethereum.Value.fromAddress(sender))
  );
  event.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  );

  event.block = block;
  event.transaction = tx;

  return event;
}

function createWithdrawEvent(
  tokenAddress: Address,
  sender: Address,
  amount: BigInt,
  block: ethereum.Block,
  tx: ethereum.Transaction
): TokensWithdrew {
  // @ts-ignore
  let event = changetype<TokensWithdrew>(newMockEvent());
  event.parameters = new Array();

  event.parameters.push(
    new ethereum.EventParam(
      "tokenAddress",
      ethereum.Value.fromAddress(tokenAddress)
    )
  );
  event.parameters.push(
    new ethereum.EventParam("sender", ethereum.Value.fromAddress(sender))
  );
  event.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  );

  event.block = block;
  event.transaction = tx;

  return event;
}

const block = getBlock(BigInt.fromI32(1), BigInt.fromI32(1));
const tx = getTransaction(
  Bytes.fromByteArray(Bytes.fromBigInt(BigInt.fromI32(1)))
);

describe("User", () => {
  afterEach(() => {
    clearStore();
  });

  test("should handle TokensDeposited event", () => {
    let tokenAddress = Address.fromString(
      "0x86e08f7d84603AEb97cd1c89A80A9e914f181679"
    );
    let sender = Address.fromString(
      "0x86e08f7d84603AEb97cd1c89A80A9e914f181678"
    );
    let amount = BigInt.fromI32(1);

    let event = createDepositEvent(tokenAddress, sender, amount, block, tx);

    onDeposit(event);

    assert.fieldEquals(
      "User",
      sender.toHexString(),
      "id",
      sender.toHexString()
    );
    assert.fieldEquals("User", sender.toHexString(), "balances", "[1]");
    assert.fieldEquals(
      "User",
      sender.toHexString(),
      "tokens",
      `[${tokenAddress.toHexString()}]`
    );
  });

  test("should handle TokensWithdrew event", () => {
    let tokenAddress = Address.fromString(
      "0x86e08f7d84603AEb97cd1c89A80A9e914f181679"
    );
    let sender = Address.fromString(
      "0x86e08f7d84603AEb97cd1c89A80A9e914f181678"
    );

    onDeposit(
      createDepositEvent(tokenAddress, sender, BigInt.fromI32(10), block, tx)
    );

    onWithdraw(
      createWithdrawEvent(tokenAddress, sender, BigInt.fromI32(4), block, tx)
    );

    assert.fieldEquals(
      "User",
      sender.toHexString(),
      "id",
      sender.toHexString()
    );
    assert.fieldEquals("User", sender.toHexString(), "balances", "[6]");
  });
});
