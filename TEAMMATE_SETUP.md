# Teammate setup — run the dapp locally

Step-by-step guide for getting the delivery-verification dapp running on your own
machine. End result: a fully working local demo with Sales / Driver / Customer
roles in your MetaMask, ready to walk through the order lifecycle in the browser.

## Prerequisites

- **Node.js 18+** — check with `node --version`
- **Git**
- **MetaMask** browser extension (Chrome, Brave, or Firefox)

## 1. Clone and install

```powershell
git clone https://github.com/Jmillsyy/IFB452-delivery-verification.git
cd IFB452-delivery-verification
npm install
cd frontend
npm install
cd ..
```

The `npm install` in the repo root pulls in Hardhat, ethers, and the dev tooling.
The second one in `frontend/` pulls in Next.js and React for the UI.

## 2. Open three PowerShell windows

All three need to be open at the same time during the demo.

### Terminal 1 — local Ethereum node (leave running)

```powershell
cd <repo path>
npx hardhat node
```

This boots a local Ethereum chain on `http://127.0.0.1:8545` and prints 20 test
accounts with 10,000 fake ETH each. **Don't close this window** — closing it
wipes the chain.

Keep this terminal scrollable; you'll want to find the printed private keys later.

### Terminal 2 — deploy and seed (one-time)

```powershell
cd <repo path>
npx hardhat run scripts/deploy.js --network localhost
```

Look at the output. You should see something like:

```
OrderContract     : 0x5FbDB2315678afecb367f032d93F642f64180aa3
DeliveryContract  : 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
Linked DeliveryContract -> OrderContract.updateStatus
Seeding roles...
  Sales       : 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
  Supplier    : 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
  Dispatch    : 0x90F79bf6EB2c4f870365E785982E1f101E93b906
  Driver      : 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65
  Customer    : 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc
```

If your printed `OrderContract` address is **different** from
`0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6` (the value currently in
`frontend/lib/contracts.js`), open that file and paste your two addresses on
lines 8 and 9. Don't commit that change — it only applies to your local chain.

This terminal's job is done once the deploy completes; you can close it.

### Terminal 3 — frontend (leave running)

```powershell
cd <repo path>/frontend
npm run dev
```

Serves the UI at `http://localhost:3000`. Open it in the browser where you have
MetaMask installed.

## 3. MetaMask setup

### Add the Hardhat network

1. Click the MetaMask extension icon
2. Hamburger menu (top-right) → **Settings** → **Networks**
3. **Add a network** → **Add a network manually**
4. Fill in:
   - Network name: `Hardhat Local`
   - Default RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency symbol: `ETH`
   - Block explorer URL: (leave blank)
5. **Save**
6. Back on the main screen, select **Hardhat Local** from the network dropdown.

### Import the role accounts

The Hardhat test accounts have publicly known private keys with no real-world
value — perfectly safe to import alongside your real MetaMask accounts.

For each account below: account selector at top of MetaMask →
**Add wallet** → **Import account** → paste the private key → Import →
rename the new account using the role name.

| Role     | Address (just for sanity check)              | Private key |
|----------|----------------------------------------------|-------------|
| Sales    | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| Driver   | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` | `0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a` |
| Customer | `0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc` | `0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba` |

Your real MetaMask accounts are not affected — these just appear as additional
accounts in the same wallet.

## 4. Demo flow

### Step 1 — Sales creates an order
1. In MetaMask, switch to the **Sales** account.
2. In the browser, click **Sales** in the nav.
3. Fill in:
   - Supplier address: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`
   - Items: leave the default `[{"sku":"BRICK-RED-001","quantity":1000}]`
   - Delivery date: `2000000000`
4. Click **Create order** → MetaMask popup → Confirm.
5. Expected: green "Order created in block X. New order ID: 0."

### Step 2 — Driver verifies and confirms
1. Switch MetaMask to **Driver**.
2. Click **Driver** in the nav.
3. Under "Scan pallets":
   - Order ID: `0`
   - Leave scanned items matching the original order
   - **Scan & verify** → Confirm in MetaMask
   - Expected: green "Pallet verified — order 0 now InTransit."
4. Under "Confirm delivery at site":
   - Order ID: `0`
   - **Confirm at site** → Confirm in MetaMask
   - Expected: green "Order 0 confirmed as Delivered."

### Step 3 — Customer views final state
1. Switch MetaMask to **Customer**.
2. Click **Customer** in the nav.
3. Order ID: `0` → **Load**
4. Expected: order card with status **Delivered**, items table, and delivery
   record showing verified + confirmed timestamps.

### Bonus — discrepancy path
1. Switch to Sales → create another order (will be ID 1).
2. Switch to Driver → scan order 1 with a wrong quantity, e.g.
   `[{"sku":"BRICK-RED-001","quantity":500}]`
3. Expected: orange "Discrepancy detected: Item mismatch."

This proves the contract is verifying scans against the on-chain order, not
just accepting whatever the driver claims.

## 5. Common errors

| Symptom | Cause | Fix |
|---------|-------|-----|
| Page shows "Wrong network. Switch MetaMask to Hardhat Local (chainId 31337)" | MetaMask is on a different network | Click the network dropdown in MetaMask → pick Hardhat Local |
| Page shows `BAD_DATA (... method: "getRole" ...)` | Contract addresses in `contracts.js` don't match your local deploy | Re-run `deploy.js`, paste the printed addresses into `frontend/lib/contracts.js` |
| `UnauthorizedRole(caller, required)` when clicking a button | MetaMask is signing with the wrong account for that role | Switch MetaMask to the matching role account (Sales for the sales page, etc.) |
| `OnlyDelivery` error | Trying to call `updateStatus` from outside the DeliveryContract | Don't call `updateStatus` directly — let the Driver page call `scanPallet` or `confirmDelivery` instead, which trigger the status change internally |
| MetaMask popup never appears when clicking a button | The dapp connection is stale | Open MetaMask → click the localhost:3000 panel at the bottom → click Connect, pick the right role account |
| "ALREADY_VERIFIED" or similar on scan | You scanned an order that's already been processed | Create a new order first (Sales page) and use its ID |

## 6. Running the tests

To run the Hardhat test suite (12 tests covering both contracts and the access
control rules):

```powershell
npx hardhat test
```

All 12 should pass.

## 7. Notes about the local chain

- The Hardhat node holds chain state in memory only. Restart it and everything
  resets — orders, deliveries, roles, the lot. You'll need to re-run `deploy.js`
  every time you restart the node.
- The deploy script always uses the default Hardhat Account #0 as admin. That
  account holds the chain-level "admin" role and is the only one that can
  assign new roles or register the DeliveryContract.
- The chain ID `31337` is the Hardhat standard. Don't change it.

## 8. Who to ping

If something breaks: paste the exact error message and the terminal output to
the group chat. Most issues come down to: wrong MetaMask account, wrong
network, or stale contract addresses.
