# IFB452 Final Submission — Assessment Criteria Mapping

> A reference for examiners and tutors: every requirement from the project
> specification mapped to the place in this codebase / slides where it is
> demonstrated.
>
> **Group 49** — Joshua Mills (N11350351), Alexander Venn (N10491406)

---

## 1. Smart contracts on Ethereum (Solidity)

| Requirement                            | Where addressed                                                                 |
|----------------------------------------|---------------------------------------------------------------------------------|
| Solidity language                       | `contracts/OrderContract.sol`, `contracts/DeliveryContract.sol` (pragma 0.8.20) |
| Ethereum target                         | Hardhat config: `hardhat.config.js`, chain ID 31337 for dev                     |
| Two distinct smart contracts            | `OrderContract` + `DeliveryContract`                                            |
| Direct cross-contract interaction       | `DeliveryContract.scanPallet` → `orderContract.getOrder()` + `orderContract.updateStatus()` |
| Custom errors (gas-efficient reverts)   | `UnauthorizedRole`, `OnlyAdmin`, `OnlyDelivery`, `OrderNotFound`, `NotOrderBuyer`, `CannotCancel`, `AlreadyVerified`, `NotVerified` |
| Events for audit trail                  | `RoleAssigned`, `RoleRevoked`, `DeliveryContractSet`, `OrderCreated`, `OrderStatusChanged`, `PalletScanned`, `DiscrepancyDetected`, `DeliveryConfirmed` |
| Immutable variables for gas saving      | `DeliveryContract.orderContract` (immutable reference)                          |

## 2. Cross-contract interaction (spec section 3.2)

| Pattern                                     | Where addressed                                          |
|---------------------------------------------|----------------------------------------------------------|
| Cross-contract **read**                     | `DeliveryContract.scanPallet` calls `orderContract.getOrder(orderId)` and iterates the on-chain `items[]` array |
| Cross-contract **write**                    | `DeliveryContract` calls `orderContract.updateStatus(orderId, OrderStatus.InTransit)` after a successful scan |
| Privilege boundary at the contract layer    | `OrderContract.updateStatus` is `external` but rejects every caller except the registered `deliveryContract` address (`OnlyDelivery` error) |
| Registration handshake                      | Admin calls `OrderContract.setDeliveryContract(address)` once after both contracts deploy. `deploy.js` does this automatically. |

## 3. Role-based access control

| Role        | Granted by | Operations allowed                                                |
|-------------|------------|-------------------------------------------------------------------|
| Admin       | Deployer   | `assignRole`, `revokeRole`, `setDeliveryContract`                 |
| Sales       | Admin      | `createOrder`, `cancelOrder` (only their own, only while Created) |
| Supplier    | Admin      | (Identity used as a destination; no write methods today)          |
| Dispatch    | Admin      | (Reserved for future scheduling extension)                        |
| Driver      | Admin      | `scanPallet`, `confirmDelivery` (only after Verified)             |
| Customer    | Admin      | Read-only view of orders + deliveries                             |

Enforced by the `onlyRole` modifier on every state-changing function in both
contracts. The modifier reverts with `UnauthorizedRole(caller, required)`.

## 4. Tests

Located in `test/DeliveryVerification.test.js`. Run with `npx hardhat test`.

| Suite                                             | Tests | Coverage                                                                 |
|---------------------------------------------------|-------|--------------------------------------------------------------------------|
| OrderContract                                     | 3     | Order creation (happy + denial), admin-only role lock                    |
| DeliveryContract — happy path                     | 2     | Matching scan, post-scan confirmation                                    |
| DeliveryContract — discrepancy path               | 3     | Item count mismatch, SKU mismatch, quantity mismatch                     |
| Access control on DeliveryContract                | 1     | Non-Driver scan denial                                                   |
| **Access control on `updateStatus`**              | **3** | Outsider, Sales, and admin all rejected from direct `updateStatus` calls |
| **Order cancellation**                            | **3** | Buyer can cancel pre-scan, outsider can't cancel, can't cancel post-scan |
| **Role governance — `revokeRole`**                | **3** | Admin can revoke, revoked driver loses access, non-admin can't revoke    |

**Total: 18 passing tests.**

## 5. BPMN process modelling

| Diagram                          | File                              |
|----------------------------------|-----------------------------------|
| Orchestration view (lanes)       | `docs/bpmn-orchestration.png/.jpg`|
| Collaboration view (pools + messages) | `docs/bpmn-collaboration.png/.jpg` |

Built in draw.io (an approved BPMN tool per the unit). Smart contract
activities are filled in the darker navy fill to distinguish from manual /
off-chain steps.

## 6. Frontend (UI / interaction)

| Component                                   | File                                         |
|---------------------------------------------|----------------------------------------------|
| Wallet connection + role detection          | `frontend/pages/index.js` + `frontend/lib/wallet.js` |
| Sales role page (create + cancel order)     | `frontend/pages/sales.js`                    |
| Driver role page (scan + confirm)           | `frontend/pages/driver.js`                   |
| Customer role page (list + detail view)     | `frontend/pages/customer.js`                 |
| Shared layout (header + nav + footer)       | `frontend/pages/_app.js`                     |
| Polished design system                      | `frontend/styles/globals.css`                |

Features: native HTML date picker, supplier dropdown, copyable tx hashes,
loading spinners, colour-coded status pills, browse-all-orders list.

## 7. Documentation

| Doc                          | Purpose                                                          |
|------------------------------|------------------------------------------------------------------|
| `README.md`                  | Project overview, architecture, quick-start                      |
| `TEAMMATE_SETUP.md`          | Step-by-step setup for a new machine, including MetaMask config  |
| `SUBMISSION.md` (this file)  | Maps every assessment criterion to the codebase                  |
| `LICENSE`                    | MIT                                                              |
| In-code NatSpec              | Every contract, function and event documented                    |

## 8. Design considerations addressed

| Concern raised                              | Where addressed                                                       |
|---------------------------------------------|-----------------------------------------------------------------------|
| **Centralization of role assignment**       | Documented as Stage 1 of a four-stage decentralization roadmap in `OrderContract.sol` NatSpec. Stage 1.5 (`revokeRole` with audit events) is shipped. Slides cover Stages 2–4 (multi-sig, peer attestation, verifiable credentials). |
| **Stack pivot (Hyperledger Fabric → Ethereum/Solidity)** | Discussed in slide 6 "Design considerations" and slide 7 methodology. |
| **Privacy on a public chain**               | Slide 6 — would use commit-reveal hashing of sensitive line items for production; mock data only in this prototype. |
| **Network connectivity at supplier yards**  | Slide 6 — discussed as a future mobile app concern, scope-capped for this demo. |
| **Supplier labelling discipline**           | Slide 6 — SKU verification is only as good as the labels; covered in the off-chain dependencies discussion. |

## 9. Presentation deliverables

| Deliverable                | Status                                              |
|----------------------------|-----------------------------------------------------|
| Slide deck (7 slides)      | `docs/` (final .pptx)                               |
| 8-minute oral presentation | Rehearsed script with alternating speakers          |
| 3-minute demo video        | Recorded covering Sales → Driver → Customer + discrepancy |
| Lab demo                   | Live walkthrough on the demo day                    |

## 10. Repository hygiene

| Item                  | Where                                                       |
|-----------------------|-------------------------------------------------------------|
| Version control       | https://github.com/Jmillsyy/IFB452-delivery-verification    |
| Commit history        | Incremental, descriptive messages                           |
| `.gitignore`          | Hardhat artifacts, node_modules, build outputs excluded     |
| License               | MIT (`LICENSE`)                                             |
