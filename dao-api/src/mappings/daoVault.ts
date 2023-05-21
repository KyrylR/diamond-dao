import {
  AuthenticationBySBT,
  AuthorizedBySBT,
  NFTDeposited,
  NFTLocked,
  NFTWithdrew,
  SBTAuthorizationRevoked,
  TokenDeposited,
  TokenLocked,
  TokenWithdrew,
} from "../../generated/DAOVault/DAOVault";

import { getOrCreateUser } from "../entities/User";
import { BigInt, log } from "@graphprotocol/graph-ts";

export function onTokenDeposited(event: TokenDeposited): void {
  const user = getOrCreateUser(event.params.sender);

  const userBalances = user.balances;
  const userTokens = user.tokens;
  const lockedTokens = user.lockedTokens;

  const index = userTokens.indexOf(event.params.tokenAddress);

  if (index == -1) {
    userTokens.push(event.params.tokenAddress);
    userBalances.push(event.params.amount);
    lockedTokens.push(BigInt.fromI32(-1));
  } else {
    userBalances[index] = userBalances.at(index).plus(event.params.amount);
  }

  user.balances = userBalances;
  user.tokens = userTokens;
  user.lockedTokens = lockedTokens;
  user.save();
}

export function onTokenWithdrew(event: TokenWithdrew): void {
  const user = getOrCreateUser(event.params.sender);

  const userBalances = user.balances;
  const userTokens = user.tokens;

  const index = userTokens.indexOf(event.params.tokenAddress);

  if (index == -1) {
    log.error("User {} doesn't have token {}", [
      user.id.toHexString(),
      event.params.tokenAddress.toHexString(),
    ]);

    return;
  }

  userBalances[index] = userBalances.at(index).minus(event.params.amount);

  user.balances = userBalances;
  user.tokens = userTokens;
  user.save();
}

export function onTokenLocked(event: TokenLocked): void {
  const user = getOrCreateUser(event.params.sender);

  if (event.params.amount > BigInt.fromI32(0)) {
    const userTokens = user.tokens;
    const lockedUserTokens = user.lockedTokens;

    const index = userTokens.indexOf(event.params.tokenAddress);

    if (index == -1) {
      log.error("User {} doesn't have token {}", [
        user.id.toHexString(),
        event.params.tokenAddress.toHexString(),
      ]);

      return;
    }

    lockedUserTokens[index] = lockedUserTokens
      .at(index)
      .plus(event.params.amount);

    user.tokens = userTokens;
    user.lockedTokens = lockedUserTokens;
    user.save();
  }
}

export function onNFTDeposited(event: NFTDeposited): void {
  const user = getOrCreateUser(event.params.sender);

  const userNFTs = user.nfts;
  const userTokens = user.tokens;
  const lockedNFTs = user.lockedTokens;

  const index = userTokens.indexOf(event.params.tokenAddress);

  if (index == -1) {
    userTokens.push(event.params.tokenAddress);
    userNFTs.push(event.params.tokenId);
    lockedNFTs.push(BigInt.fromI32(-1));
  } else {
    userNFTs[index] = userNFTs[index].plus(event.params.tokenId);
  }

  user.nfts = userNFTs;
  user.tokens = userTokens;
  user.lockedTokens = lockedNFTs;

  user.save();
}

export function onNFTWithdrew(event: NFTWithdrew): void {
  const user = getOrCreateUser(event.params.sender);

  const userNFTs = user.nfts;
  const userTokens = user.tokens;

  const index = userTokens.indexOf(event.params.tokenAddress);

  if (index == -1) {
    log.error("User {} doesn't have NFT {}", [
      user.id.toHexString(),
      event.params.tokenAddress.toHexString(),
    ]);

    return;
  }

  if (userNFTs.length == 0) {
    log.error("User {} doesn't have NFT {} with id {}", [
      user.id.toHexString(),
      event.params.tokenAddress.toHexString(),
      event.params.tokenId.toString(),
    ]);

    return;
  }

  userNFTs[index] = userNFTs[userNFTs.length - 1];
  userNFTs.pop();

  user.nfts = userNFTs;
  user.tokens = userTokens;

  user.save();
}

export function onNFTLocked(event: NFTLocked): void {
  const user = getOrCreateUser(event.params.sender);

  const userNFTs = user.nfts;
  const lockedUserNFTs = user.lockedTokens;

  const index = userNFTs.indexOf(event.params.tokenId);

  if (index == -1) {
    log.error("User {} doesn't have NFT {}", [
      user.id.toHexString(),
      event.params.tokenAddress.toHexString(),
    ]);

    return;
  }

  if (userNFTs.length == 0) {
    log.error("User {} doesn't have NFT {} with id {}", [
      user.id.toHexString(),
      event.params.tokenAddress.toHexString(),
      event.params.tokenId.toString(),
    ]);

    return;
  }

  lockedUserNFTs[index] = event.params.tokenId;

  user.nfts = userNFTs;
  user.lockedTokens = lockedUserNFTs;

  user.save();
}

export function onAuthenticationBySBT(event: AuthenticationBySBT): void {
  const user = getOrCreateUser(event.params.sender);

  const userTokens = user.tokens;

  const index = userTokens.indexOf(event.params.tokenAddress);

  if (index == -1) {
    userTokens.push(event.params.tokenAddress);
  }

  user.isSBTAuthorized = true;
  user.tokens = userTokens;

  user.save();
}

export function onAuthorizedBySBT(event: AuthorizedBySBT): void {
  const user = getOrCreateUser(event.params.sender);

  const userTokens = user.tokens;

  const index = userTokens.indexOf(event.params.tokenAddress);

  if (index == -1) {
    userTokens.push(event.params.tokenAddress);
  }

  user.isSBTAuthorized = true;
  user.tokens = userTokens;

  user.save();
}

export function onSBTAuthorizationRevoked(
  event: SBTAuthorizationRevoked
): void {
  const user = getOrCreateUser(event.params.sender);

  user.isSBTAuthorized = false;

  user.save();
}
