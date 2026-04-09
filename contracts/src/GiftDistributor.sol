// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title GiftDistributor
 * @notice Creator locks ERC-20 in one tx; each wallet may `claim` at most once per campaign.
 * @dev Constructor: `initialCreationFee` in token smallest units (e.g. 500_000 = 0.5 for USDC/EURC on Arc).
 *      `creationFee` is charged in the same token as the pool and sent to `feeRecipient` before the pool pull.
 *      Owner may call `setCreationFee` / `setFeeRecipient` to adjust pricing and payout.
 */
contract GiftDistributor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Campaign {
        address token;
        uint256 amountPerClaim;
        uint256 maxClaims;
        uint256 claimedCount;
        address creator;
        bool exists;
    }

    mapping(bytes32 => Campaign) public campaigns;
    mapping(bytes32 => mapping(address => bool)) public hasClaimed;
    mapping(address => bool) public isTokenSupported;

    /// @notice Fee in the same token decimals as the campaign stablecoin (e.g. 500_000 = 0.5 for USDC/EURC on Arc).
    address public feeRecipient;
    uint256 public creationFee;

    error UnsupportedToken();
    error CampaignExists();
    error CampaignMissing();
    error SoldOut();
    error AlreadyClaimed();
    error ZeroAmount();
    error ZeroAddress();

    event CampaignFunded(
        bytes32 indexed campaignId,
        address indexed creator,
        address indexed token,
        uint256 amountPerClaim,
        uint256 maxClaims,
        uint256 totalDeposited
    );
    event GiftClaimed(bytes32 indexed campaignId, address indexed claimer, uint256 amount);
    event CreationFeeUpdated(uint256 newFee);
    event FeeRecipientUpdated(address indexed newRecipient);

    constructor(
        address initialOwner,
        address[] memory supportedTokens,
        address initialFeeRecipient,
        uint256 initialCreationFee
    ) Ownable(initialOwner) {
        if (initialFeeRecipient == address(0)) revert ZeroAddress();
        feeRecipient = initialFeeRecipient;
        creationFee = initialCreationFee;
        uint256 n = supportedTokens.length;
        for (uint256 i = 0; i < n; ++i) {
            isTokenSupported[supportedTokens[i]] = true;
        }
    }

    function setTokenSupported(address token, bool supported) external onlyOwner {
        isTokenSupported[token] = supported;
    }

    /// @param newFee Amount in token smallest units (6 decimals for Arc USDC/EURC). Set to 0 to disable creation fee.
    function setCreationFee(uint256 newFee) external onlyOwner {
        creationFee = newFee;
        emit CreationFeeUpdated(newFee);
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert ZeroAddress();
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(newRecipient);
    }

    /// @notice Deposit `amountPerClaim * maxClaims` and open a campaign. `campaignId` must be unique (e.g. keccak256 off-chain uuid).
    function fundCampaign(bytes32 campaignId, address token, uint256 amountPerClaim, uint256 maxClaims) external nonReentrant {
        if (!isTokenSupported[token]) revert UnsupportedToken();
        if (campaigns[campaignId].exists) revert CampaignExists();
        if (amountPerClaim == 0 || maxClaims == 0) revert ZeroAmount();

        uint256 total = Math.mulDiv(amountPerClaim, maxClaims, 1);
        uint256 fee = creationFee;
        if (fee > 0) {
            IERC20(token).safeTransferFrom(msg.sender, feeRecipient, fee);
        }
        IERC20(token).safeTransferFrom(msg.sender, address(this), total);

        campaigns[campaignId] = Campaign({
            token: token,
            amountPerClaim: amountPerClaim,
            maxClaims: maxClaims,
            claimedCount: 0,
            creator: msg.sender,
            exists: true
        });

        emit CampaignFunded(campaignId, msg.sender, token, amountPerClaim, maxClaims, total);
    }

    /// @notice One claim per wallet per campaign while supply lasts.
    function claim(bytes32 campaignId) external nonReentrant {
        Campaign storage c = campaigns[campaignId];
        if (!c.exists) revert CampaignMissing();
        if (c.claimedCount >= c.maxClaims) revert SoldOut();
        if (hasClaimed[campaignId][msg.sender]) revert AlreadyClaimed();

        hasClaimed[campaignId][msg.sender] = true;
        unchecked {
            c.claimedCount += 1;
        }

        IERC20(c.token).safeTransfer(msg.sender, c.amountPerClaim);
        emit GiftClaimed(campaignId, msg.sender, c.amountPerClaim);
    }
}
