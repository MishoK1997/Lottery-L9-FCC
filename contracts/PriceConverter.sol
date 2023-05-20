// SPDX-License-Identifier:MIT

pragma solidity ^0.8.8;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

library PriceConverter {
    function getPrice(
        AggregatorV3Interface priceFeed
    ) internal view returns (uint) {
        (, int price, , , ) = priceFeed.latestRoundData();
        return uint(price * 1e10);
    }

    function priceConversionRate(
        uint _ethAmount,
        AggregatorV3Interface priceFeed
    ) internal view returns (uint) {
        return (_ethAmount * getPrice(priceFeed)) / 1e18;
    }
}
