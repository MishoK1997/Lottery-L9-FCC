const { network, ethers } = require("hardhat");
const { developmentChains } = require("../helper.hardhat.config.js");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;

  const BASE_FEE = ethers.utils.parseEther("0.25");
  const GAS_PRICE_LINK = 1e9;

  if (developmentChains.includes(network.name)) {
    log("Mock Detected...");
    await deploy("VRFCoordinatorV2Mock", {
      from: deployer,
      args: [BASE_FEE, GAS_PRICE_LINK],
      log: true,
      waitConfirmations: 1,
    });
    log("VRFCoordinatorV2 Mock deployed!!!");
    log("======================================================");
  }
};

module.exports.tags = ["all", "vrf-mock"];
