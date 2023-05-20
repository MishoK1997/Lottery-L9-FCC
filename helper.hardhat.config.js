const { ethers } = require("hardhat");

const developmentChains = ["hardhat", "localhost"];

const networkConfigurations = {
  11155111: {
    name: "sepolia",
    ethUsdPriceFeedAddress: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
    vrfCoordinatorV2InterfaceAddress:
      "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
    entranceFee: ethers.utils.parseEther("0.000751569"), // 1 * 1e18 is one eth in wei
    keyHash:
      "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
    subscriptionId: "1661", // test
    callbackGasLimit: "500000",
    interval: "30",
  },

  31337: {
    name: "hardhat",
    //vrfCoordinatorV2InterfaceAddress = "",
    //entranceFee: ethers.utils.parseEther("0.015"), // 0.015 ETH = 30$
    entranceFee: "30", // 30$ --> 0.015;
    keyHash:
      "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
    callbackGasLimit: "500000",
    interval: "30",
  },
};

module.exports = {
  developmentChains,
  networkConfigurations,
};
