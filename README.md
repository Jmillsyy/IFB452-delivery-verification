# Delivery Verification on the Blockchain

A two-contract Solidity application for a building-products supply chain.
Sales create customer orders on-chain; drivers scan pallets at the supplier
yard; the smart contracts verify the load against the order and either
confirm departure or flag a discrepancy — all without trusting an
intermediary.

> **Course:** IFB452 Blockchain Technology
> **Group:** 49
> **Authors:** Joshua Mills (N11350351), Alexander Venn (N10491406)

---

## Why this project exists

Building-products supply chains run on paper, PDFs and CSV exports. When a
pallet of wrong-quantity bricks shows up on a building site, there's no
canonical record of what was scanned, by whom, and what the original order
actually said. Disputes turn into he-said-she-said.

This project moves the verification step on-chain: the order is recorded
immutably, the driver's scan is cryptographically signed, and any
mismatch is logged as an on-chain `DiscrepancyDetected` event that anyone
in the supply chain can read.

## Stack

| Layer            | Tech                                                                   |
|------------------|------------------------------------------------------------------------|
| Smart contracts  | Solidity 0.8.20 with custom errors and immutable cross-contract refs   |
| Dev environment  | Hardhat (compiler, in-memory node, Mocha+Chai test runner)             |
| Frontend         | Next.js 14 (pages router) + React 18                                   |
| Blockchain glue  | ethers.js v6                                                           |
| Wallet           | MetaMask (each role is a different account)                            |
| Modelling        | BPMN 2.0 — orchestration + collaboration views in `docs/`              |

## Architecture in one diagram

```
   Sales         Driver        Customer
     │             │              │
     │ createOrder │ scanPallet   │ getOrder
     │             │ confirmDelivery       │
     ▼             ▼              ▼
 ┌─────────────┐  ┌─────────────────┐
 │OrderContract│◀─│ DeliveryContract│
 │             │  │                 │
 │ roles[]     │  │ deliveries[]    │
 │ orders[]    │  │ cross-contract  │
 │ updateStatus│──│  reads + calls  │
 └─────────────┘  └─────────────────┘
        ▲                ▲
        └────── on-chain audit trail (events) ───────┐
                                                      │
                                                Customer
```

## Repo layout

```
.
├── contracts/                  Solidity smart contracts
│   ├── OrderContract.sol       Sales create/cancel orders; role registry; access control
│   └── DeliveryContract.sol    Driver scan + verify; cross-contract calls into Order
├── test/                       Hardhat (Mocha + Chai) tests
│   └── DeliveryVerification.test.js
├── scripts/
│   ├── deploy.js               Deploy + seed roles + link DeliveryContract
│   └── demo-data.js            Seed 3 demo orders in different terminal states
├── docs/                       Architecture diagram, BPMN exports
│   ├── bpmn-orchestration.png  / .jpg
│   └── bpmn-collaboration.png  / .jpg
├── frontend/                   Next.js role-based UI
│   ├── pages/                  index, sales, driver, customer
│   ├── lib/                    wallet.js, contracts.js (ABIs + addresses)
│   ├── styles/globals.css      Polished design system
│   └── public/favicon.svg
├── TEAMMATE_SETUP.md           Step-by-step setup guide for collaborators
├── SUBMISSION.md               Maps every assessment criterion to where it's addressed
└── README.md                   You are here
```

## What's implemented

### Smart contracts (two contracts, cross-contract calls)

- **OrderContract** — role registry (Sales/Supplier/Dispatch/Driver/Customer),
  order lifecycle (`Created` → `InTransit` → `Delivered`/`Cancelled`), and the
  audit log via events. Role assignment is admin-gated; role revocation is
  explicit with a reason string for transparent off-boarding.
- **DeliveryContract** — driver scans pallets, the contract reads the matching
  order from OrderContract, compares item-by-item via `keccak256`, and either
  emits `PalletScanned(matched=true)` plus a cross-contract `updateStatus` call,
  or emits `DiscrepancyDetected` with the reason.

### Access control

- `onlyRole(Role.X)` modifier enforces role at every state-changing entry point.
- `onlyAdmin` modifier gates role management.
- `updateStatus` is locked to the registered `DeliveryContract` address only —
  no application-layer bypass possible.
- `cancelOrder` is restricted to the original buyer, and only while the order
  is still in `Created` state.

### Frontend

Three role-specific pages plus a home page, all wired to ethers.js:

- **Home** — connect MetaMask, display address + current role.
- **Sales** — create orders (dropdown supplier picker, date picker), cancel orders.
- **Driver** — scan pallets, confirm delivery on site; surfaces discrepancy reasons.
- **Customer** — read-only browse all orders; per-order detail view with full
  on-chain record (status pills, items table, delivery timestamps).

All transactions display the tx hash with copy-to-clipboard.

### Tests

18 tests covering:

- Order creation by Sales role (happy + denial)
- Admin-only role assignment
- Cross-contract verification on matching scan
- All three discrepancy types (item count, SKU mismatch, quantity mismatch)
- Non-driver scan rejection
- `updateStatus` access control (outsider, Sales, admin all rejected)
- Admin-only DeliveryContract registration
- `revokeRole` governance (admin can revoke, revoked driver loses access, non-admin can't revoke)
- `cancelOrder` (buyer-only, status-guarded against post-pickup cancellation)

Run them with:

```
npx hardhat test
```

## Quick start

For a fresh machine, see [TEAMMATE_SETUP.md](TEAMMATE_SETUP.md) for the
step-by-step walkthrough including MetaMask config and importing role accounts.

In short:

```bash
# Install
npm install
cd frontend && npm install && cd ..

# Three terminals:
npx hardhat node                                            # Terminal 1
npx hardhat run scripts/deploy.js --network localhost       # Terminal 2 (one-time)
cd frontend && npm run dev                                  # Terminal 3
```

Then open `http://localhost:3000`.

## Demo flows

1. **Happy path** — Sales creates order → Driver scans matching pallets →
   Driver confirms at site → Customer views final state.
2. **Discrepancy path** — Driver scans wrong quantity → contract records
   `DiscrepancyDetected` with reason and does not advance the status.
3. **Access control** — Non-Sales account tries `createOrder`, fails with
   `UnauthorizedRole`. Outsider tries `updateStatus`, fails with `OnlyDelivery`.
4. **Cancellation** — Sales cancels an order before scanning; fails after scan
   with `CannotCancel`.

Want a fast-forward demo? Run `npx hardhat run scripts/demo-data.js --network localhost`
after the initial deploy — it creates three orders already in different
terminal states (Delivered / InTransit / Discrepancy).

## Architectural notes — decentralization trade-off

The current architecture is a **permissioned consortium model** — operationally
centralized at the role-assignment layer, but trustless at the operational
verification layer (pallet matching, status updates, discrepancy detection).
This matches real enterprise rollouts (IBM Food Trust, Maersk TradeLens) where
a known operator handles onboarding while the chain provides immutable audit
trails and cryptographic verification.

The contract documents a four-stage decentralization roadmap in its NatSpec:

1. **Stage 1 (this version)** — Single admin for bootstrap simplicity.
2. **Stage 2** — Multi-sig admin (Gnosis Safe N-of-M stakeholders).
3. **Stage 3** — Peer-attested onboarding (web of trust).
4. **Stage 4** — W3C Verifiable Credentials issued by independent regulators
   (e.g., NHVR for heavy-vehicle drivers).

Stage 1.5 is already shipped: `revokeRole` with explicit `RoleRevoked` events
provides transparent off-boarding without requiring a chain redeploy.

## License

MIT — see [LICENSE](LICENSE).
