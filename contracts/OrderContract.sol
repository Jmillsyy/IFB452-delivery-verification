// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title OrderContract
 * @notice Records customer orders on-chain. Acts as the single source of truth for the
 *         delivery lifecycle. Other contracts (DeliveryContract) read order data from here
 *         to verify pickups against what was originally requested.
 * @dev Roles are managed in this contract; DeliveryContract reads them for cross-contract
 *      access checks. Admin (deployer) bootstraps role assignments at setup.
 */
contract OrderContract {
    // ---------------------------------------------------------------- types

    enum Role { None, Sales, Supplier, Dispatch, Driver, Customer }
    enum OrderStatus { Created, InTransit, Delivered, Cancelled }

    struct Item {
        string sku;
        uint256 quantity;
    }

    struct Order {
        uint256 id;
        address buyer;
        address supplier;
        Item[] items;
        OrderStatus status;
        uint256 deliveryDate;
        uint256 createdAt;
    }

    // ---------------------------------------------------------------- state

    address public admin;
    uint256 public nextOrderId;

    mapping(address => Role) public roles;
    mapping(uint256 => Order) private orders;

    // ---------------------------------------------------------------- events

    event RoleAssigned(address indexed account, Role role);
    event OrderCreated(uint256 indexed orderId, address indexed buyer, address indexed supplier);
    event OrderStatusChanged(uint256 indexed orderId, OrderStatus newStatus);

    // ---------------------------------------------------------------- errors

    error UnauthorizedRole(address caller, Role required);
    error OnlyAdmin(address caller);
    error OrderNotFound(uint256 orderId);

    // ---------------------------------------------------------------- modifiers

    modifier onlyRole(Role required) {
        if (roles[msg.sender] != required) revert UnauthorizedRole(msg.sender, required);
        _;
    }

    modifier onlyAdmin() {
        if (msg.sender != admin) revert OnlyAdmin(msg.sender);
        _;
    }

    // ---------------------------------------------------------------- constructor

    constructor() {
        admin = msg.sender;
    }

    // ---------------------------------------------------------------- role management

    /// @notice Admin assigns a role to an address. Used during initial deployment seeding.
    function assignRole(address account, Role role) external onlyAdmin {
        roles[account] = role;
        emit RoleAssigned(account, role);
    }

    /// @notice External read for DeliveryContract to check a caller's role.
    function getRole(address account) external view returns (Role) {
        return roles[account];
    }

    // ---------------------------------------------------------------- order lifecycle

    /// @notice Sales creates a new customer order. Records all line items on-chain.
    /// @param supplier      The supplier address fulfilling this order.
    /// @param items         Line items (sku + quantity) requested.
    /// @param deliveryDate  Required delivery date (unix timestamp).
    /// @return orderId      Newly minted order ID.
    function createOrder(
        address supplier,
        Item[] calldata items,
        uint256 deliveryDate
    ) external onlyRole(Role.Sales) returns (uint256 orderId) {
        orderId = nextOrderId++;
        Order storage o = orders[orderId];
        o.id = orderId;
        o.buyer = msg.sender;
        o.supplier = supplier;
        o.status = OrderStatus.Created;
        o.deliveryDate = deliveryDate;
        o.createdAt = block.timestamp;
        for (uint256 i = 0; i < items.length; i++) {
            o.items.push(items[i]);
        }
        emit OrderCreated(orderId, msg.sender, supplier);
    }

    /// @notice Returns the full order record. Used by DeliveryContract to verify scans.
    function getOrder(uint256 orderId) external view returns (Order memory) {
        if (orders[orderId].createdAt == 0) revert OrderNotFound(orderId);
        return orders[orderId];
    }

    /// @notice Update order status. Called by DeliveryContract during the lifecycle.
    /// @dev TODO (week 12): restrict to the authorised DeliveryContract address only.
    function updateStatus(uint256 orderId, OrderStatus newStatus) external {
        if (orders[orderId].createdAt == 0) revert OrderNotFound(orderId);
        orders[orderId].status = newStatus;
        emit OrderStatusChanged(orderId, newStatus);
    }
}
