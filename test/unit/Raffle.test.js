const { assert, expect } = require("chai");
const { getNamedAccounts, deployments, network, ethers } = require("hardhat");
const { developmentChains } = require("../../helper.hardhat.config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle", async () => {
      let raffle,
        deployer,
        vrfCoordinatorV2Mock,
        mockV3Aggregator,
        entranceFee,
        interval;

      beforeEach(async () => {
        await deployments.fixture(["all"]);
        deployer = (await getNamedAccounts()).deployer;
        raffle = await ethers.getContract("Raffle", deployer);
        mockV3Aggregator = await ethers.getContract("MockV3Aggregator");
        vrfCoordinatorV2Mock = await ethers.getContract(
          "VRFCoordinatorV2Mock",
          deployer
        );
        interval = await raffle.getInterval();
        entranceFee = ethers.utils.parseEther("0.015"); // it is 30$
      });

      describe("constructor", async () => {
        it("Address of AggregatorV3Interface setup is correctly", async () => {
          const response = await raffle.getAggregatorAddress();
          assert.equal(response, mockV3Aggregator.address);
        });

        it("initialize the raffle correctly", async () => {
          const raffleState = await raffle.getRaffleState();
          assert.equal(raffleState.toString(), "0");
          // assert.equal(await raffle.getInterval(), n_interval);
        });
      });

      describe("enterRaffle", async () => {
        it("If you willn't pay relevant 30USD, it will revert", async () => {
          const val = ethers.utils.parseEther("1");
          await expect(raffle.enterRaffle({ value: val })).to.be.revertedWith(
            "Raffle__PayCorrectPrice"
          );
        });
        it("If state of raffle is not open revert", async () => {
          await raffle.enterRaffle({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          await raffle.performUpkeep([]);

          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
          const raffleState = await raffle.getRaffleState();
          assert.equal(raffleState.toString(), "1");
          assert.equal(upkeepNeeded, false);
        });
      });

      describe("checkUpkeep", async () => {
        it("return false if people does not sent any eth", async () => {
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
          assert.equal(upkeepNeeded, false); // is equal to assert(!upkeepNeeded);
        });

        it("return false if raffle state is not OPEN", async () => {
          await raffle.enterRaffle({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine");
          await raffle.performUpkeep([]);
          const raffleState = await raffle.getRaffleState();
          assert.equal(raffleState.toString(), "1");
          const { checkUpkeep } = raffle.callStatic.checkUpkeep([]);
          assert(!checkUpkeep);
        });
      });

      describe("performUpkeep", async () => {
        it("If upkeepNeeded is false performUpkeep will revert", async () => {
          await expect(raffle.performUpkeep([])).to.be.revertedWith(
            "Raffle__UpkeepNotNeeded"
          );
        });
        it("It can run only if upkeepNeeded is true", async () => {
          await raffle.enterRaffle({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine");
          const { upkeepNeeded } = await raffle.checkUpkeep([]);
          const tx = await raffle.performUpkeep([]);
          assert(tx);
          assert(upkeepNeeded);
        });
        it("update the raffle state, emit and event, and call VRFCoordinator", async () => {
          await raffle.enterRaffle({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);

          const txResponse = await raffle.performUpkeep([]);
          const txReceipt = await txResponse.wait(1);
          const raffleState = await raffle.getRaffleState();
          const requestId = await txReceipt.events[1].args.requestId;
          assert.equal(raffleState.toString(), "1");
          assert(requestId.toNumber() > 0);
          assert(txResponse);
        });
      });

      describe("fulfillRandomWords", async () => {
        beforeEach(async () => {
          await raffle.enterRaffle({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
        });

        it("cal only be called after performUpkeep", async () => {
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
          ).to.be.revertedWith("nonexistent request");
        });

        // Massive Attackkkkkk!!!!!!!!1

        it("Pick a winner, reset a lottery send a money", async () => {
          const accounts = await ethers.getSigners();
          const additionalEntrance = 3;
          const startingIndex = 2;
          for (
            let i = startingIndex;
            i < additionalEntrance + startingIndex;
            i++
          ) {
            const connectedAcc = raffle.connect(accounts[i]);
            await connectedAcc.enterRaffle({ value: entranceFee });
          }
          const startingTimeStamp = await raffle.getLastTimeStamp();

          await new Promise(async (resolve, reject) => {
            raffle.once("PickedWinner", async () => {
              console.log("PickedWinner event fired!!!");

              try {
                const recentWinner = await raffle.getRecentWinner();

                const winnerBalance = await accounts[2].getBalance();
                const raffleState = await raffle.getRaffleState();
                const endingTimeStamp = await raffle.getLastTimeStamp();
                await expect(raffle.getPlayer(0)).to.be.reverted;
                assert(endingTimeStamp > startingTimeStamp);
                assert.equal(raffleState.toString(), "0");
                assert.equal(recentWinner, accounts[2].address);
                assert.equal(
                  winnerBalance.toString(),
                  startingBalance // startingBalance + ( (raffleEntranceFee * additionalEntrances) + raffleEntranceFee )
                    .add(entranceFee.mul(additionalEntrance).add(entranceFee))
                    .toString()
                );
                resolve();
              } catch (e) {
                reject(e);
              }
            });
            const tx = await raffle.performUpkeep([]);
            const txReceipt = await tx.wait(1);
            const startingBalance = await accounts[2].getBalance();
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              txReceipt.events[1].args.requestId,
              raffle.address
            );
          });
        });
      });
    });
