// Sales role page — create a new customer order on-chain.
// Calls OrderContract.createOrder(supplier, items, deliveryDate) via ethers.js.

import { useState } from "react";
import { connectWallet, getOrderContract } from "../lib/wallet";

// Preset Hardhat addresses — the same accounts the deploy script seeds with roles.
// Lets the user pick from a dropdown instead of pasting hex.
const KNOWN_SUPPLIERS = [
  { label: "Supplier (Account #2)", address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" },
  { label: "Dispatch (Account #3)", address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906" },
];

// Convert a yyyy-mm-dd date string to a unix timestamp (seconds).
function dateToUnix(dateStr) {
  if (!dateStr) return null;
  return Math.floor(new Date(dateStr).getTime() / 1000);
}

export default function Sales() {
  // Form state
  const [supplier, setSupplier] = useState(KNOWN_SUPPLIERS[0].address);
  const [itemsJson, setItemsJson] = useState(
    '[{"sku":"BRICK-RED-001","quantity":1000}]'
  );
  const [deliveryDate, setDeliveryDate] = useState("");

  // UI state
  const [status, setStatus] = useState("idle"); // idle | pending | success | error
  const [message, setMessage] = useState("");
  const [orderId, setOrderId] = useState(null);
  const [txHash, setTxHash] = useState(null);

  // Cancel form state
  const [cancelId, setCancelId] = useState("");
  const [cancelStatus, setCancelStatus] = useState("idle");
  const [cancelMessage, setCancelMessage] = useState("");
  const [cancelTxHash, setCancelTxHash] = useState(null);

  async function onCreateOrder() {
    setStatus("pending");
    setMessage("Waiting for MetaMask...");
    setOrderId(null);
    setTxHash(null);

    try {
      const items = JSON.parse(itemsJson);
      if (!Array.isArray(items) || items.length === 0) {
        throw new Error("Items must be a non-empty array");
      }

      const unixDate = dateToUnix(deliveryDate);
      if (!unixDate || unixDate <= 0) {
        throw new Error("Please pick a delivery date");
      }

      const { signer } = await connectWallet();
      const order = getOrderContract(signer);

      setMessage("Sending transaction...");
      const tx = await order.createOrder(supplier, items, unixDate);
      setTxHash(tx.hash);

      setMessage("Waiting for block confirmation...");
      const receipt = await tx.wait();

      // Find the OrderCreated event
      let newId = null;
      for (const log of receipt.logs) {
        try {
          const parsed = order.interface.parseLog(log);
          if (parsed && parsed.name === "OrderCreated") {
            newId = parsed.args.orderId.toString();
            break;
          }
        } catch (_) { /* skip */ }
      }

      setOrderId(newId);
      setStatus("success");
      setMessage(`Order created in block ${receipt.blockNumber}`);
    } catch (e) {
      setStatus("error");
      setMessage(e.shortMessage || e.message || String(e));
    }
  }

  async function onCancelOrder() {
    setCancelStatus("pending");
    setCancelMessage("Waiting for MetaMask...");
    setCancelTxHash(null);

    try {
      const { signer } = await connectWallet();
      const order = getOrderContract(signer);

      setCancelMessage("Sending transaction...");
      const tx = await order.cancelOrder(Number(cancelId));
      setCancelTxHash(tx.hash);

      setCancelMessage("Waiting for block confirmation...");
      await tx.wait();

      setCancelStatus("success");
      setCancelMessage(`Order ${cancelId} cancelled.`);
    } catch (e) {
      setCancelStatus("error");
      setCancelMessage(e.shortMessage || e.message || String(e));
    }
  }

  function copy(value) {
    navigator.clipboard.writeText(value);
  }

  return (
    <>
      <h1>Sales</h1>
      <p className="subtitle">Create a customer order. Recorded on-chain via OrderContract.createOrder().</p>

      <div className="card">
        <h2>New order</h2>

        <label>Supplier</label>
        <select value={supplier} onChange={(e) => setSupplier(e.target.value)}>
          {KNOWN_SUPPLIERS.map((s) => (
            <option key={s.address} value={s.address}>
              {s.label} — {s.address.slice(0, 8)}...{s.address.slice(-4)}
            </option>
          ))}
        </select>

        <label>Items (JSON array of sku + quantity)</label>
        <textarea
          rows={4}
          value={itemsJson}
          onChange={(e) => setItemsJson(e.target.value)}
        />

        <label>Delivery date</label>
        <input
          type="date"
          value={deliveryDate}
          onChange={(e) => setDeliveryDate(e.target.value)}
        />

        <button onClick={onCreateOrder} disabled={status === "pending"}>
          {status === "pending" && <span className="spinner"></span>}
          {status === "pending" ? "Sending..." : "Create order"}
        </button>

        {message && (
          <p style={{
            marginTop: "1rem",
            color: status === "error" ? "#b91c1c" : status === "success" ? "#15803d" : "#5b6b7c",
          }}>
            {message}
          </p>
        )}

        {orderId !== null && (
          <p>New order ID: <code>{orderId}</code></p>
        )}

        {txHash && (
          <div className="tx-hash">
            <span>Tx:</span>
            <code>{txHash}</code>
            <button className="copy-btn" onClick={() => copy(txHash)}>Copy</button>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Cancel an order</h2>
        <p className="subtitle" style={{ marginBottom: "1rem" }}>
          You can cancel one of your own orders while it's still in Created state
          (before the driver scans the pallet).
        </p>

        <label>Order ID</label>
        <input
          placeholder="0"
          value={cancelId}
          onChange={(e) => setCancelId(e.target.value)}
        />

        <button onClick={onCancelOrder} disabled={cancelStatus === "pending" || !cancelId}>
          {cancelStatus === "pending" && <span className="spinner"></span>}
          {cancelStatus === "pending" ? "Cancelling..." : "Cancel order"}
        </button>

        {cancelMessage && (
          <p style={{
            marginTop: "1rem",
            color: cancelStatus === "error" ? "#b91c1c" : cancelStatus === "success" ? "#15803d" : "#5b6b7c",
          }}>
            {cancelMessage}
          </p>
        )}

        {cancelTxHash && (
          <div className="tx-hash">
            <span>Tx:</span>
            <code>{cancelTxHash}</code>
            <button className="copy-btn" onClick={() => copy(cancelTxHash)}>Copy</button>
          </div>
        )}
      </div>
    </>
  );
}
