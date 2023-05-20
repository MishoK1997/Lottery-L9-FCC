const { ethers, network } = require("hardhat");
const {
  developmentChains,
  networkConfigurations,
} = require("../helper.hardhat.config");
module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  const SUB_FUND_AMOUNT = ethers.utils.parseEther("10");

  // Variable Declarations
  let ethUsdPriceFeedAddress,
    entranceFee,
    vrfCoordinatorMock,
    vrfCoordinatorAddress,
    gasLane,
    subscriptionId,
    callbackGasLimit,
    interval;

  // logic and deploy
  if (developmentChains.includes(network.name)) {
    ethUsdAggregatorMock = await deployments.get("MockV3Aggregator");
    ethUsdPriceFeedAddress = ethUsdAggregatorMock.address; // address of mockv3Aggregator for price feed

    vrfCoordinatorMock = await ethers.getContract(
      "VRFCoordinatorV2Mock",
      deployer
    );
    vrfCoordinatorAddress = vrfCoordinatorMock.address; // address of vrfCoordinatorV2InterfaceMock
    const subResponse = await vrfCoordinatorMock.createSubscription();
    const subReceipt = await subResponse.wait(1);

    subscriptionId = subReceipt.events[0].args.subId;
    await vrfCoordinatorMock.fundSubscription(subscriptionId, SUB_FUND_AMOUNT);
  } else {
    ethUsdPriceFeedAddress =
      networkConfigurations[chainId]["ethUsdPriceFeedAddress"]; // real address deployed on sepolia net, of priceFeed
    vrfCoordinatorAddress =
      networkConfigurations[chainId]["vrfCoordinatorV2InterfaceAddress"];
    subscriptionId = networkConfigurations[chainId]["subscriptionId"];
  }

  entranceFee = networkConfigurations[chainId]["entranceFee"];
  gasLane = networkConfigurations[chainId]["keyHash"];
  callbackGasLimit = networkConfigurations[chainId]["callbackGasLimit"];
  interval = networkConfigurations[chainId]["interval"];

  const args = [
    entranceFee,
    ethUsdPriceFeedAddress,
    vrfCoordinatorAddress,
    gasLane,
    subscriptionId,
    callbackGasLimit,
    interval,
  ];
  log("Raffle Deploying...");
  const raffle = await deploy("Raffle", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });
  log("Raffle deployed!!!");
  log("========================================================");

  await vrfCoordinatorMock.addConsumer(subscriptionId, raffle.address);
};

module.exports.tags = ["all", "raffle"];
