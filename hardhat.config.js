require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("hardhat-deploy");
require("solidity-coverage");
require("hardhat-gas-reporter");
require("hardhat-contract-sizer");
require("dotenv").config();

const { Private_API_KEY, Sepolia_RPC_URL, Coinmarketcap_API_KEY } = process.env;
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.18",

  defaultNetwork: "hardhat",

  networks: {
    sepolia: {
      chainId: 11155111,
      url: Sepolia_RPC_URL,
      accounts: [Private_API_KEY],
      blockConfirmations: 6,
    },

    hardhat: {
      chainId: 31337,
      blockConfirmations: 1,
    },
  },

  namedAccounts: {
    deployer: {
      default: 0,
    },
    player: {
      default: 1,
    },
  },

  gasReporter: {
    enabled: true,
    noColors: true,
    currency: "USD",
    token: "ETH",
    coinmarketcap: Coinmarketcap_API_KEY,
    outputFile: "./gas-reporter.txt",
  },
  mocha: {
    timeout: 500000, // 500 seconds max for running tests
  },
};
