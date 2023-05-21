import {
  TokensDeposited,
  TokensWithdrew,
} from "../../generated/DAOVault/DAOVault";

import { getOrCreateUser } from "../entities/User";

export function onDeposit(event: TokensDeposited): void {
  const user = getOrCreateUser(event.params.sender);

  const userBalances = user.balances;
  const userTokens = user.tokens;

  const index = userTokens.indexOf(event.params.tokenAddress);

  if (index == -1) {
    userTokens.push(event.params.tokenAddress);
    userBalances.push(event.params.amount);
  } else {
    userBalances[index] = userBalances.at(index).plus(event.params.amount);
  }

  user.balances = userBalances;
  user.tokens = userTokens;
  user.save();
}

export function onWithdraw(event: TokensWithdrew): void {
  const user = getOrCreateUser(event.params.sender);

  const userBalances = user.balances;
  const userTokens = user.tokens;

  const index = userTokens.indexOf(event.params.tokenAddress);

  if (index == -1) {
    userTokens.push(event.params.tokenAddress);
    userBalances.push(event.params.amount);
  } else {
    userBalances[index] = userBalances.at(index).minus(event.params.amount);
  }

  user.balances = userBalances;
  user.tokens = userTokens;
  user.save();
}
