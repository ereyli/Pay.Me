// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title PayRouter
 * @notice Pulls ERC-20 from the payer, takes a protocol fee, forwards the remainder to the recipient.
 * @dev Intended for USDC / EURC on Arc: only whitelisted token addresses can be used.
 *      Payer must `approve` this contract for `amount` before calling {pay}.
 */
contract PayRouter is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Hard cap on fee (10%). Owner cannot exceed this.
    uint16 public constant MAX_FEE_BPS = 1000;
    uint16 public constant BPS_DENOMINATOR = 10_000;

    /// @notice Fee in basis points (e.g. 5 = 0.05%).
    uint16 public feeBps;
    address public feeRecipient;

    mapping(address token => bool) public isTokenSupported;

    error UnsupportedToken();
    error ZeroAddress();
    error ZeroAmount();
    error FeeTooHigh();

    event Paid(
        address indexed token,
        address indexed payer,
        address indexed recipient,
        uint256 grossAmount,
        uint256 feeAmount,
        uint256 netAmount,
        bytes32 paymentRef
    );
    event FeeBpsUpdated(uint16 oldFeeBps, uint16 newFeeBps);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event TokenSupportUpdated(address indexed token, bool supported);

    /**
     * @param initialOwner Multisig or EOA that administers fees and token list.
     * @param feeRecipient_ Receives fee skim (cannot be zero).
     * @param feeBps_ Initial fee in bps; must be <= {MAX_FEE_BPS}.
     * @param supportedTokens_ ERC-20 contracts allowed for {pay} (e.g. USDC + EURC on Arc).
     */
    constructor(address initialOwner, address feeRecipient_, uint16 feeBps_, address[] memory supportedTokens_)
        Ownable(initialOwner)
    {
        if (feeRecipient_ == address(0)) revert ZeroAddress();
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh();

        feeRecipient = feeRecipient_;
        feeBps = feeBps_;

        uint256 n = supportedTokens_.length;
        for (uint256 i = 0; i < n; ++i) {
            address t = supportedTokens_[i];
            if (t == address(0)) revert ZeroAddress();
            isTokenSupported[t] = true;
            emit TokenSupportUpdated(t, true);
        }
    }

    /**
     * @notice Transfer `amount` of `token` from msg.sender: fee to {feeRecipient}, rest to `recipient`.
     * @param paymentRef Optional id (e.g. keccak256(slug || requestId)) for off-chain indexing; not validated on-chain.
     */
    function pay(address token, address recipient, uint256 amount, bytes32 paymentRef) external nonReentrant {
        if (!isTokenSupported[token]) revert UnsupportedToken();
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        IERC20 t = IERC20(token);
        uint256 feeAmount = Math.mulDiv(amount, feeBps, BPS_DENOMINATOR);
        uint256 netAmount = amount - feeAmount;

        t.safeTransferFrom(msg.sender, address(this), amount);

        if (feeAmount != 0) {
            t.safeTransfer(feeRecipient, feeAmount);
        }
        t.safeTransfer(recipient, netAmount);

        emit Paid(token, msg.sender, recipient, amount, feeAmount, netAmount, paymentRef);
    }

    function setFeeBps(uint16 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_FEE_BPS) revert FeeTooHigh();
        uint16 old = feeBps;
        feeBps = newFeeBps;
        emit FeeBpsUpdated(old, newFeeBps);
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert ZeroAddress();
        address old = feeRecipient;
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(old, newRecipient);
    }

    function setTokenSupported(address token, bool supported) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        isTokenSupported[token] = supported;
        emit TokenSupportUpdated(token, supported);
    }

    /// @notice Recover stray ERC-20 (mis-sent tokens). Does not affect normal fee flow.
    function rescueERC20(address token, address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        IERC20(token).safeTransfer(to, amount);
    }
}
