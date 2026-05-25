// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title OrderContract
 * @notice Records customer orders on-chain. Acts as the single source of truth for the
 *         delivery lifecycle. Other contracts (DeliveryContract) read order data from here
 *         to verify pickups against what was originally requested.
 * @dev Roles are managed in this contract; DeliveryContract reads them for cross-contract
 *      access checks. Admin (deployer) bootstraps role assignments at setup.
 *
 *      ----------------------------------------------------------------------------
 *      GOVERNANCE NOTE (acknowledging architectural feedback):
 *      ----------------------------------------------------------------------------
 *      The current admin model is a single-key "permissioned consortium" pattern,
 *      common in enterprise blockchain rollouts (IBM Food Trust, TradeLens). It is
 *      operationally centralized at the role-assignment layer, but the operational
 *      verification layer (pallet matching, status updates, discrepancy detection)
 *      remains trustless and tamper-evident.
 *
 *      Production roadmap to reduce centralization:
 *        Stage 1 (this version) — Single admin for bootstrap simplicity.
 *        Stage 2 — Multi-sig admin (Gnosis Safe, N-of-M stakeholders).
 *        Stage 3 — Peer-attested onboarding (M existing peers must vouch).
 *        Stage 4 — W3C verifiable credentials issued by independent regulators
 *                  (e.g., NHVR for heavy-vehicle drivers); contract verifies the
 *                  credential signature instead of relying on a manual assignment.
 *      ----------------------------------------------------------------------------
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
    address public deliveryContract;          // authorised DeliveryContract address
    uint256 public nextOrderId;

    mapping(address => Role) public roles;
    mapping(uint256 => Order) private orders;

    // ---------------------------------------------------------------- events

    event RoleAssigned(address indexed account, Role role);
    event RoleRevoked(address indexed account, Role previousRole, string reason);
    event DeliveryContractSet(address indexed delivery);
    event OrderCreated(uint256 indexed orderId, address indexed buyer, address indexed supplier);
    event OrderStatusChanged(uint256 indexed orderId, OrderStatus newStatus);

    // ---------------------------------------------------------------- errors

    error UnauthorizedRole(address caller, Role required);
    error OnlyAdmin(address caller);
    error OnlyDelivery(address caller);
    error OrderNotFound(uint256 orderId);
    error NotOrderBuyer(address caller, address buyer);
    error CannotCancel(uint256 orderId, OrderStatus currentStatus);

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
    /// @dev In Stage 2 (roadmap), this would require N-of-M multi-sig confirmation
    ///      instead of being callable by a single admin key.
    function assignRole(address account, Role role) external onlyAdmin {
        roles[account] = role;
        emit RoleAssigned(account, role);
    }

    /// @notice Admin revokes a role from an address. Used to remove compromised, retired,
    ///         or misbehaving participants from the consortium.
    /// @dev    Emits RoleRevoked with the previous role for full audit history. Setting a
    ///         role to None via assignRole would also work but loses the reason metadata,
    ///         so revokeRole is preferred for any disciplinary action.
    ///         In Stage 2, revocation should also require multi-sig confirmation.
    ///         In Stage 3+, this becomes automatic via slashing rules on repeated
    ///         DiscrepancyDetected events.
    /// @param  account The address being revoked.
    /// @param  reason  Free-text justification (e.g., "repeated discrepancies", "off-boarded").
    function revokeRole(address account, string calldata reason) external onlyAdmin {
        Role previous = roles[account];
        roles[account] = Role.None;
        emit RoleRevoked(account, previous, reason);
    }

    /// @notice External read for DeliveryContract to check a caller's role.
    function getRole(address account) external view returns (Role) {
        return roles[account];
    }

    /// @notice Admin registers the DeliveryContract that is allowed to update order status.
    /// @dev    Called once after both contracts are deployed. Re-callable by admin
    ///         only (e.g., if DeliveryContract needs to be upgraded).
    function setDeliveryContract(address delivery) external onlyAdmin {
        deliveryContract = delivery;
        emit DeliveryContractSet(delivery);
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

    /// @notice The Sales buyer cancels an order they created. Only allowed while the
    ///         order is still in Created state (i.e., before the driver scans the pallet).
    /// @dev    Auth: caller must be the original buyer of the order. Status guard prevents
    ///         cancelling orders that are already in transit or delivered.
    function cancelOrder(uint256 orderId) external {
        Order storage o = orders[orderId];
        if (o.createdAt == 0) revert OrderNotFound(orderId);
        if (o.buyer != msg.sender) revert NotOrderBuyer(msg.sender, o.buyer);
        if (o.status != OrderStatus.Created) revert CannotCancel(orderId, o.status);

        o.status = OrderStatus.Cancelled;
        emit OrderStatusChanged(orderId, OrderStatus.Cancelled);
    }

    /// @notice Update order status. Restricted to the registered DeliveryContract only.
    /// @dev    Even though this function is `external`, only the DeliveryContract address
    ///         registered via setDeliveryContract() can invoke it. Enforces the cross-contract
    ///         privilege boundary at the contract layer — no application-level bypass possible.
    function updateStatus(uint256 orderId, OrderStatus newStatus) external {
        if (msg.sender != deliveryContract) revert OnlyDelivery(msg.sender);
        if (orders[orderId].createdAt == 0) revert OrderNotFound(orderId);
        orders[orderId].status = newStatus;
        emit OrderStatusChanged(orderId, newStatus);
    }
}
