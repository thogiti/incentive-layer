
// source: https://github.com/OpenZeppelin/zeppelin-solidity

pragma solidity ^0.4.11;

import '../../contracts/math/SafeMath.sol';

contract SafeMathMock {
  uint256 public result;

  function multiply(uint256 a, uint256 b) public {
    result = SafeMath.mul(a, b);
  }

  function subtract(uint256 a, uint256 b) public {
    result = SafeMath.sub(a, b);
  }

  function add(uint256 a, uint256 b) public {
    result = SafeMath.add(a, b);
  }
}
