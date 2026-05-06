// Deploy + seed script for the delivery verification system.
//
// Usage:
//   1. Start a local Hardhat node in one terminal:
//        npx hardhat node
//   2. In another terminal, deploy + seed:
//        npx hardhat run scripts/deploy.js --network localhost
//
// Outputs the contract addresses and the role-seeded wallets so you can
// paste them into frontend/lib/contracts.js for the UI.

const { ethers } = require("hardhat");

const Role = { None: 0, Sales: 1, Supplier: 2, Dispatch: 3, Driver: 4, Customer: 5 };

async function main() {
  const signers = await ethers.getSigners();
  const [admin, sales, supplier, dispatch, driver, customer] = signers;

  console.log("\nDeploying with admin:", admin.address);

  // ---- OrderContract ----
  const OrderContract = await ethers.getContractFactory("OrderContract");
  const orderContract = await OrderContract.deploy();
  await orderContract.waitForDeployment();
  const orderAddr = await orderContract.getAddress();
  console.log("OrderContract     :", orderAddr);

  // ---- DeliveryContract ----
  const DeliveryContract = await ethers.getContractFactory("DeliveryContract");
  const deliveryContract = await DeliveryContract.deploy(orderAddr);
  await deliveryContract.waitForDeployment();
  const deliveryAddr = await deliveryContract.getAddress();
  console.log("DeliveryContract  :", deliveryAddr);

  // ---- Seed roles ----
  console.log("\nSeeding roles...");
  await (await orderContract.assignRole(sales.address,    Role.Sales)).wait();
  await (await orderContract.assignRole(supplier.address, Role.Supplier)).wait();
  await (await orderContract.assignRole(dispatch.address, Role.Dispatch)).wait();
  await (await orderContract.assignRole(driver.address,   Role.Driver)).wait();
  await (await orderContract.assignRole(customer.address, Role.Customer)).wait();

  console.log("\nRole assignments:");
  console.log("  Sales       :", sales.address);
  console.log("  Supplier    :", supplier.address);
  console.log("  Dispatch    :", dispatch.address);
  console.log("  Driver      :", driver.address);
  console.log("  Customer    :", customer.address);

  console.log("\nCopy these into frontend/lib/contracts.js:");
  console.log(`  ORDER_CONTRACT_ADDRESS    = "${orderAddr}";`);
  console.log(`  DELIVERY_CONTRACT_ADDRESS = "${deliveryAddr}";`);
  console.log("\nDone.\n");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
