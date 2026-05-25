// Demo data preset script.
//
// Creates three orders in different terminal states so a fresh demo can show
// all three lifecycle paths immediately without manual setup:
//
//   Order #0 — Created → Delivered     (happy path, fully completed)
//   Order #1 — Created → InTransit     (mid-flight)
//   Order #2 — Created → Discrepancy   (driver scanned with wrong qty)
//
// Run AFTER `npx hardhat run scripts/deploy.js --network localhost`.
// Usage:
//   npx hardhat run scripts/demo-data.js --network localhost

const { ethers } = require("hardhat");

// These should match what `deploy.js` printed and what's pasted into
// `frontend/lib/contracts.js`. If you redeploy, update these.
//
// The deterministic first-deploy addresses (fresh hardhat node + one deploy):
const ORDER_ADDRESS    = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const DELIVERY_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

async function main() {
  const [_admin, sales, supplier, _dispatch, driver, _customer] = await ethers.getSigners();

  const order = await ethers.getContractAt("OrderContract", ORDER_ADDRESS);
  const delivery = await ethers.getContractAt("DeliveryContract", DELIVERY_ADDRESS);

  const items = [
    { sku: "BRICK-RED-001", quantity: 1000 },
    { sku: "CEMENT-50KG", quantity: 20 },
  ];
  const deliveryDate = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 1 week out

  console.log("\nSeeding demo data...\n");

  // ------- Order #0: happy path (Delivered)
  await (await order.connect(sales).createOrder(supplier.address, items, deliveryDate)).wait();
  await (await delivery.connect(driver).scanPallet(0, items)).wait();
  await (await delivery.connect(driver).confirmDelivery(0)).wait();
  console.log("  Order #0 → Delivered (happy path)");

  // ------- Order #1: mid-flight (InTransit, no confirmation yet)
  await (await order.connect(sales).createOrder(supplier.address, items, deliveryDate)).wait();
  await (await delivery.connect(driver).scanPallet(1, items)).wait();
  console.log("  Order #1 → InTransit (scanned, not yet confirmed)");

  // ------- Order #2: discrepancy (driver scanned wrong quantity)
  const wrongItems = [
    { sku: "BRICK-RED-001", quantity: 500 }, // intentionally wrong
    { sku: "CEMENT-50KG", quantity: 20 },
  ];
  await (await order.connect(sales).createOrder(supplier.address, items, deliveryDate)).wait();
  await (await delivery.connect(driver).scanPallet(2, wrongItems)).wait();
  console.log("  Order #2 → Discrepancy (item mismatch on scan)");

  console.log("\nDone. Refresh the Customer page in the browser to see all three.\n");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
