const { developmentChains } = require("../helper.hardhat.config");
const { network } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const DECIMAL = 8,
    INITIAL_ANSWER = 200000000000;

  if (developmentChains.includes(network.name)) {
    log("Mock of MockV3Aggregator Detected...");
    await deploy("MockV3Aggregator", {
      from: deployer,
      args: [DECIMAL, INITIAL_ANSWER],
      log: true,
      waitConfirmations: 1,
    });
    log("Deployed Mockv3Aggregator!!!");
    log("=========================================");
  }
};

module.exports.tags = ["all", "aggregator-mock"];
