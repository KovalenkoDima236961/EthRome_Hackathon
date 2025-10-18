// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IERC5192 {
    /// @notice Emitted when a token becomes non-transferable.
    event Locked(uint256 tokenId);
    /// @notice Emitted when a token becomes transferable again. In our case never.
    event Unlocked(uint256 tokenId);
    /// @notice Returns true if the token exists and is locked.
    function locked(uint256 tokenId) external view returns (bool);
}