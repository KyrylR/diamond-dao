import "@nomiclabs/hardhat-web3";
import "@nomiclabs/hardhat-truffle5";
import "@nomiclabs/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";

import "@typechain/hardhat";

import "@dlsl/hardhat-migrate";
import "@dlsl/hardhat-markup";

import "hardhat-gas-reporter";
import "hardhat-abi-exporter";
import "hardhat-contract-sizer";
import "solidity-coverage";

import "tsconfig-paths/register";

import { HardhatUserConfig } from "hardhat/config";

import * as dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: "../.env" });

function privateKey() {
  return process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [];
}

function typechainTarget() {
  const target = process.env.TYPECHAIN_TARGET;

  return target === "" || target === undefined ? "ethers-v5" : target;
}

function forceTypechain() {
  return process.env.TYPECHAIN_FORCE !== "false";
}

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      initialDate: "1970-01-01T00:00:00Z",
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      initialDate: "1970-01-01T00:00:00Z",
      gasMultiplier: 1.2,
    },
    mainnet: {
      url: "https://rpc.q.org",
      accounts: privateKey(),
      gasMultiplier: 1.2,
    },
    devnet: {
      url: "http://63.34.190.209:8545/",
      accounts: privateKey(),
      gasMultiplier: 1.2,
    },
    testnet: {
      url: "https://rpc.qtestnet.org/",
      accounts: privateKey(),
      gasMultiplier: 1.2,
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_KEY}`,
      accounts: privateKey(),
      gasMultiplier: 1.2,
    },
    mumbai: {
      url: `https://rpc-mumbai.maticvigil.com/`,
      accounts: privateKey(),
      gasMultiplier: 1.2,
    },
    ethereum: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`,
      accounts: privateKey(),
      gasMultiplier: 1.2,
    },
  },
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: false,
      evmVersion: "berlin",
    },
  },
  etherscan: {
    apiKey: {
      devnet: "abc",
      testnet: "abc",
      mainnet: "abc",
      sepolia: `${process.env.ETHERSCAN_KEY}`,
      polygonMumbai: `${process.env.POLYGONSCAN_KEY}`,
    },
    customChains: [
      {
        network: "devnet",
        chainId: 35442,
        urls: {
          apiURL: "http://54.73.188.73:8080/api",
          browserURL: "http://54.73.188.73:8080",
        },
      },
      {
        network: "testnet",
        chainId: 35443,
        urls: {
          apiURL: "https://explorer.qtestnet.org/api",
          browserURL: "https://explorer.qtestnet.org",
        },
      },
      {
        network: "mainnet",
        chainId: 35441,
        urls: {
          apiURL: "https://explorer.q.org/api",
          browserURL: "https://explorer.q.org",
        },
      },
    ],
  },
  migrate: {
    pathToMigrations: "./deploy/",
  },
  mocha: {
    timeout: 1000000,
  },
  contractSizer: {
    alphaSort: false,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: false,
  },
  gasReporter: {
    enabled: false,
  },
  typechain: {
    outDir: `generated-types/${typechainTarget().split("-")[0]}`,
    target: typechainTarget(),
    alwaysGenerateOverloads: true,
    discriminateTypes: true,
    dontOverrideCompile: !forceTypechain(),
  },
  abiExporter: {
    clear: true,
    flat: true,
    format: "json",
  },
};

export default config;
