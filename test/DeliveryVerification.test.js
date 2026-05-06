// Hardhat test suite for the delivery verification system.
// Run with:  npx hardhat test
//
// Covers (Week 11 baseline):
//   1. Order creation by Sales role
//   2. Access control: non-Sales cannot create orders
//   3. Cross-contract verification: matching scan succeeds
//   4. Cross-contract verification: mismatched scan emits DiscrepancyDetected

const { expect } = require("chai");
const { ethers } = require("hardhat");

const Role = { None: 0, Sales: 1, Supplier: 2, Dispatch: 3, Driver: 4, Customer: 5 };
const OrderStatus = { Created: 0, InTransit: 1, Delivered: 2, Cancelled: 3 };

describe("Delivery Verification System", function () {
  let orderContract, deliveryContract;
  let admin, sales, supplier, driver, customer, outsider;

  const DELIVERY_DATE = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 1 week from now

  const sampleItems = [
    { sku: "BRICK-RED-001", quantity: 1000 },
    { sku: "CEMENT-50KG", quantity: 20 },
  ];

  beforeEach(async function () {
    [admin, sales, supplier, driver, customer, outsider] = await ethers.getSigners();

    // Deploy OrderContract
    const OrderContract = await ethers.getContractFactory("OrderContract");
    orderContract = await OrderContract.deploy();
    await orderContract.waitForDeployment();

    // Deploy DeliveryContract pointing at OrderContract
    const DeliveryContract = await ethers.getContractFactory("DeliveryContract");
    deliveryContract = await DeliveryContract.deploy(await orderContract.getAddress());
    await deliveryContract.waitForDeployment();

    // Seed roles (admin only)
    await orderContract.connect(admin).assignRole(sales.address, Role.Sales);
    await orderContract.connect(admin).assignRole(supplier.address, Role.Supplier);
    await orderContract.connect(admin).assignRole(driver.address, Role.Driver);
    await orderContract.connect(admin).assignRole(customer.address, Role.Customer);
  });

  describe("OrderContract", function () {
    it("Sales account can create an order", async function () {
      const tx = await orderContract
        .connect(sales)
        .createOrder(supplier.address, sampleItems, DELIVERY_DATE);

      await expect(tx)
        .to.emit(orderContract, "OrderCreated")
        .withArgs(0, sales.address, supplier.address);

      const order = await orderContract.getOrder(0);
      expect(order.buyer).to.equal(sales.address);
      expect(order.supplier).to.equal(supplier.address);
      expect(order.status).to.equal(OrderStatus.Created);
      expect(order.items.length).to.equal(2);
      expect(order.items[0].sku).to.equal("BRICK-RED-001");
    });

    it("Non-Sales account cannot create an order", async function () {
      await expect(
        orderContract
          .connect(outsider)
          .createOrder(supplier.address, sampleItems, DELIVERY_DATE)
      ).to.be.revertedWithCustomError(orderContract, "UnauthorizedRole");
    });

    it("Only admin can assign roles", async function () {
      await expect(
        orderContract.connect(sales).assignRole(outsider.address, Role.Driver)
      ).to.be.revertedWithCustomError(orderContract, "OnlyAdmin");
    });
  });

  describe("DeliveryContract — happy path", function () {
    beforeEach(async function () {
      await orderContract
        .connect(sales)
        .createOrder(supplier.address, sampleItems, DELIVERY_DATE);
    });

    it("Driver scans matching pallets and load is verified", async function () {
      const tx = await deliveryContract.connect(driver).scanPallet(0, sampleItems);

      await expect(tx)
        .to.emit(deliveryContract, "PalletScanned")
        .withArgs(0, driver.address, true);

      const delivery = await deliveryContract.getDelivery(0);
      expect(delivery.status).to.equal(1); // Verified

      const order = await orderContract.getOrder(0);
      expect(order.status).to.equal(OrderStatus.InTransit);
    });

    it("Driver confirms delivery after successful scan", async function () {
      await deliveryContract.connect(driver).scanPallet(0, sampleItems);

      const tx = await deliveryContract.connect(driver).confirmDelivery(0);
      await expect(tx).to.emit(deliveryContract, "DeliveryConfirmed").withArgs(0, driver.address);

      const order = await orderContract.getOrder(0);
      expect(order.status).to.equal(OrderStatus.Delivered);
    });
  });

  describe("DeliveryContract — discrepancy path", function () {
    beforeEach(async function () {
      await orderContract
        .connect(sales)
        .createOrder(supplier.address, sampleItems, DELIVERY_DATE);
    });

    it("Mismatched item count emits DiscrepancyDetected", async function () {
      const wrongItems = [{ sku: "BRICK-RED-001", quantity: 1000 }]; // missing cement
      const tx = await deliveryContract.connect(driver).scanPallet(0, wrongItems);

      await expect(tx).to.emit(deliveryContract, "DiscrepancyDetected");

      const delivery = await deliveryContract.getDelivery(0);
      expect(delivery.status).to.equal(2); // Discrepancy
    });

    it("Mismatched SKU emits DiscrepancyDetected", async function () {
      const wrongItems = [
        { sku: "BRICK-RED-001", quantity: 1000 },
        { sku: "CEMENT-25KG", quantity: 20 }, // wrong SKU
      ];
      const tx = await deliveryContract.connect(driver).scanPallet(0, wrongItems);

      await expect(tx).to.emit(deliveryContract, "DiscrepancyDetected");
    });

    it("Mismatched quantity emits DiscrepancyDetected", async function () {
      const wrongItems = [
        { sku: "BRICK-RED-001", quantity: 999 }, // wrong qty
        { sku: "CEMENT-50KG", quantity: 20 },
      ];
      const tx = await deliveryContract.connect(driver).scanPallet(0, wrongItems);

      await expect(tx).to.emit(deliveryContract, "DiscrepancyDetected");
    });
  });

  describe("Access control on DeliveryContract", function () {
    it("Non-Driver cannot scan pallets", async function () {
      await orderContract
        .connect(sales)
        .createOrder(supplier.address, sampleItems, DELIVERY_DATE);

      await expect(
        deliveryContract.connect(outsider).scanPallet(0, sampleItems)
      ).to.be.revertedWithCustomError(deliveryContract, "UnauthorizedRole");
    });
  });
});
