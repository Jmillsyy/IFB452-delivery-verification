# IFB452 — Delivery Verification on the Blockchain

A two-contract Solidity application for a building-products supply chain. Sales create
customer orders on-chain; drivers scan pallets at the supplier; the smart contract verifies
the load against the order and either confirms departure or flags a discrepancy.

> **Course:** IFB452 Blockchain Technology · **Group:** [number] · **Authors:** Joshua Mills (N11350351), [Teammate Name] ([Student Number])

---

## Stack

- **Smart contracts:** Solidity 0.8.20 + Hardhat
- **Frontend:** Next.js + ethers.js + MetaMask
- **BPMN:** Signavio (models exported to `/docs/`)

## Repo layout

```
.
├── contracts/                Solidity smart contracts
│   ├── OrderContract.sol     Sales create + read orders; role registry
│   └── DeliveryContract.sol  Driver scan + verify against OrderContract
├── test/                     Hardhat (Mocha/Chai) tests
├── scripts/                  Deployment + role-seeding scripts
├── docs/                     Architecture diagram, BPMN exports, slides
└── frontend/                 Next.js role-based UI (sales / driver / customer)
```

## Setup (do this once)

Both team members need:

1. **Node.js LTS** — verify with `node --version` (should be >= 18).
2. **VS Code** with the *Solidity* extension by Juan Blanco.
3. **MetaMask** browser extension (use a throwaway wallet for development).

Then in this repo:

```bash
# Install Hardhat dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

## Run the contracts (local Hardhat node)

```bash
# Compile
npx hardhat compile

# Run tests (should be all green)
npx hardhat test

# Start local blockchain (leave running in its own terminal)
npx hardhat node

# In another terminal: deploy + seed roles
npx hardhat run scripts/deploy.js --network localhost
```

The deploy script prints the contract addresses and the seeded role wallets — copy those into `frontend/lib/contracts.js` for the UI.

## Run the frontend

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000` and connect MetaMask to the Hardhat local network
(RPC `http://127.0.0.1:8545`, Chain ID `31337`).

## Demo flows

1. **Happy path** — Sales account creates an order; Driver scans matching pallets; load confirmed.
2. **Discrepancy path** — Sales creates an order; Driver scans a wrong pallet; contract reverts with `DiscrepancyDetected`.
3. **Access control** — Non-Sales account tries `createOrder`, fails with `UnauthorizedRole`.

## Team split

| Owner    | Area                                                                       |
| -------- | -------------------------------------------------------------------------- |
| Person A | Smart contracts, Hardhat tests, deploy scripts, BPMN orchestration view    |
| Person B | Next.js frontend, MetaMask integration, role-based UI, BPMN collaboration  |
| Both     | Architecture diagram, integration testing, slides, video                   |

## Key dates

| Milestone                     | Date         |
| ----------------------------- | ------------ |
| Progress slides submission    | 15 May 2026  |
| Final demo (lab)              | 25-29 May    |
| 3-min demo video submission   | 29 May 2026  |
