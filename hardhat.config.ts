import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import '@openzeppelin/hardhat-upgrades';
const { mnemonic} = require('./secrets.json');
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
    },
    binancetestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545", 
      accounts: {mnemonic: mnemonic}, 
}
  },
  solidity: {
    version: "0.8.18",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 40000
  }
}