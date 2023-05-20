// SPDX-License-Identifier:MIT

pragma solidity ^0.8.8;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/AutomationCompatible.sol";
import "./PriceConverter.sol";

//import "./hardhat/console.sol"";
error Raffle__PayCorrectPrice();
error Raffle__UpkeepNotNeeded();
error Raffle__NotOpen();
error Raffle__TransaferFailed();

contract Raffle is VRFConsumerBaseV2, AutomationCompatibleInterface {
    using PriceConverter for uint;

    // Type declaration
    enum RaffleState {
        OPEN,
        CALCULATING
    }

    // State Variables
    address payable[] private s_players;
    RaffleState private s_raffleState;
    uint private s_lastTimeStamp;
    address private s_recentWinner;

    // Raffle variables
    AggregatorV3Interface private immutable i_priceFeed;
    uint private immutable i_entranceFee; // Note: we are using USD currency
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint private immutable i_interval;

    bytes32 private immutable i_keyHash;
    uint64 private immutable i_subscriptionId;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private immutable i_callbackGasLimit;
    uint32 private constant NUM_WORDS = 1;

    // Events
    event RaffleEnter(address indexed enteredAddress);
    event RequestedRaffleWinner(uint indexed requestId);
    event PickedWinner(address indexed winner);

    // Functions

    constructor(
        uint entranceFee,
        address priceFeedAddress,
        address vrfCoordinatorV2,
        bytes32 gasLane,
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        uint interval
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_priceFeed = AggregatorV3Interface(priceFeedAddress);
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_entranceFee = entranceFee;
        i_keyHash = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_raffleState = RaffleState.OPEN;
        i_interval = interval;
        s_lastTimeStamp = block.timestamp;
    }

    function enterRaffle() public payable {
        if (
            msg.value.priceConversionRate(i_priceFeed) !=
            i_entranceFee * 10 ** 18
        )
            // msg.value should be 30$
            revert Raffle__PayCorrectPrice();
        if (s_raffleState != RaffleState.OPEN) revert Raffle__NotOpen();

        s_players.push(payable(msg.sender));
        emit RaffleEnter(msg.sender);
    }

    function checkUpkeep(
        bytes memory /*checkData*/
    )
        public
        view
        override
        returns (bool upkeepNeeded, bytes memory /*performData*/)
    {
        bool isOpen = (s_raffleState == RaffleState.OPEN);
        bool timePassed = ((s_lastTimeStamp - i_interval) > i_interval);
        bool hasPlayer = (s_players.length > 0);
        bool hasBalance = (address(this).balance > 0);

        upkeepNeeded = (isOpen && timePassed && hasPlayer && hasBalance);
        return (upkeepNeeded, "0x0");
    }

    function performUpkeep(bytes memory /*performData*/) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");

        if (!upkeepNeeded) revert Raffle__UpkeepNotNeeded();

        s_raffleState = RaffleState.CALCULATING;

        uint requestId = i_vrfCoordinator.requestRandomWords(
            i_keyHash,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );

        emit RequestedRaffleWinner(requestId);
    }

    function fulfillRandomWords(
        uint256 /*requestId*/,
        uint256[] memory randomWords
    ) internal override {
        uint indexOfWinner = randomWords[0] % s_players.length;

        address payable recentWinner = s_players[indexOfWinner];

        s_recentWinner = recentWinner;
        s_raffleState = RaffleState.OPEN;
        s_lastTimeStamp = block.timestamp;
        s_players = new address payable[](0);

        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        if (!success) revert Raffle__TransaferFailed();

        emit PickedWinner(recentWinner);
    }

    // Pure/View functions

    function getAggregatorAddress()
        public
        view
        returns (AggregatorV3Interface)
    {
        return i_priceFeed;
    }

    function getEntranceFee() public view returns (uint) {
        return i_entranceFee;
    }

    function getRaffleState() public view returns (RaffleState) {
        return s_raffleState;
    }

    function getInterval() public view returns (uint) {
        return i_interval;
    }

    function getLastTimeStamp() public view returns (uint) {
        return s_lastTimeStamp;
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getPlayer(uint index) public view returns (address) {
        return s_players[index];
    }
}

//console.log(await ethers.utils.formatEther(await raffle.getEntranceFee()));
