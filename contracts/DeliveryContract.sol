// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { OrderContract } from "./OrderContract.sol";

/**
 * @title DeliveryContract
 * @notice Manages pickup and delivery for orders created in OrderContract.
 *         Drivers scan pallets at the supplier; the contract reads the matching
 *         OrderContract record and either confirms departure or flags a discrepancy.
 * @dev Demonstrates direct cross-contract interaction (called out as favourable in
 *      the IFB452 project specification, section 3.2).
 */
contract DeliveryContract {
    // ---------------------------------------------------------------- types

    enum DeliveryStatus { NotStarted, Verified, Discrepancy, Confirmed }

    struct ScannedItem {
        string sku;
        uint256 quantity;
    }

    struct Delivery {
        uint256 orderId;
        address driver;
        DeliveryStatus status;
        uint256 verifiedAt;
        uint256 confirmedAt;
    }

    // ---------------------------------------------------------------- state

    OrderContract public immutable orderContract;
    mapping(uint256 => Delivery) public deliveries; // orderId => Delivery

    // ---------------------------------------------------------------- events

    event PalletScanned(uint256 indexed orderId, address indexed driver, bool matched);
    event DiscrepancyDetected(uint256 indexed orderId, address indexed driver, string reason);
    event DeliveryConfirmed(uint256 indexed orderId, address indexed driver);

    // ---------------------------------------------------------------- errors

    error UnauthorizedRole(address caller, OrderContract.Role required);
    error AlreadyVerified(uint256 orderId);
    error NotVerified(uint256 orderId);

    // ---------------------------------------------------------------- modifiers

    modifier onlyRole(OrderContract.Role required) {
        if (orderContract.getRole(msg.sender) != required) {
            revert UnauthorizedRole(msg.sender, required);
        }
        _;
    }

    // ---------------------------------------------------------------- constructor

    constructor(address orderContractAddress) {
        orderContract = OrderContract(orderContractAddress);
    }

    // ---------------------------------------------------------------- pickup verification

    /**
     * @notice Driver scans pallets at the supplier. Verifies them against the order.
     * @dev Cross-contract read: pulls order items from OrderContract and compares
     *      to the scanned items. Reverts on mismatch via DiscrepancyDetected event.
     * @param orderId       The order being picked up.
     * @param scanned       The scanned items (sku + quantity) at the supplier.
     */
    function scanPallet(
        uint256 orderId,
        ScannedItem[] calldata scanned
    ) external onlyRole(OrderContract.Role.Driver) {
        if (deliveries[orderId].status == DeliveryStatus.Verified) {
            revert AlreadyVerified(orderId);
        }

        OrderContract.Order memory expected = orderContract.getOrder(orderId);

        // Check item count first
        if (scanned.length != expected.items.length) {
            deliveries[orderId] = Delivery({
                orderId: orderId,
                driver: msg.sender,
                status: DeliveryStatus.Discrepancy,
                verifiedAt: 0,
                confirmedAt: 0
            });
            emit DiscrepancyDetected(orderId, msg.sender, "Item count mismatch");
            emit PalletScanned(orderId, msg.sender, false);
            return;
        }

        // Check each item matches by sku + quantity
        for (uint256 i = 0; i < expected.items.length; i++) {
            if (
                keccak256(bytes(scanned[i].sku)) != keccak256(bytes(expected.items[i].sku))
                || scanned[i].quantity != expected.items[i].quantity
            ) {
                deliveries[orderId] = Delivery({
                    orderId: orderId,
                    driver: msg.sender,
                    status: DeliveryStatus.Discrepancy,
                    verifiedAt: 0,
                    confirmedAt: 0
                });
                emit DiscrepancyDetected(orderId, msg.sender, "Item mismatch");
                emit PalletScanned(orderId, msg.sender, false);
                return;
            }
        }

        // All matched
        deliveries[orderId] = Delivery({
            orderId: orderId,
            driver: msg.sender,
            status: DeliveryStatus.Verified,
            verifiedAt: block.timestamp,
            confirmedAt: 0
        });
        orderContract.updateStatus(orderId, OrderContract.OrderStatus.InTransit);
        emit PalletScanned(orderId, msg.sender, true);
    }

    /**
     * @notice Driver confirms delivery at the customer site.
     *         Only callable after a successful pallet scan.
     */
    function confirmDelivery(uint256 orderId) external onlyRole(OrderContract.Role.Driver) {
        Delivery storage d = deliveries[orderId];
        if (d.status != DeliveryStatus.Verified) revert NotVerified(orderId);

        d.status = DeliveryStatus.Confirmed;
        d.confirmedAt = block.timestamp;
        orderContract.updateStatus(orderId, OrderContract.OrderStatus.Delivered);

        emit DeliveryConfirmed(orderId, msg.sender);
    }

    /// @notice View helper for the customer/dispatch UI.
    function getDelivery(uint256 orderId) external view returns (Delivery memory) {
        return deliveries[orderId];
    }
}
