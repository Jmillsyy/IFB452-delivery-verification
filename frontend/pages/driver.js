// Driver role page — scan pallets at the supplier and confirm delivery on-site.
// Calls DeliveryContract.scanPallet(orderId, scanned) and DeliveryContract.confirmDelivery(orderId).
// Watches the receipt for PalletScanned / DiscrepancyDetected / DeliveryConfirmed events.

import { useState } from "react";
import { connectWallet, getDeliveryContract } from "../lib/wallet";

export default function Driver() {
  // --- Scan form state ---
  const [scanOrderId, setScanOrderId] = useState("");
  const [scannedJson, setScannedJson] = useState(
    '[{"sku":"BRICK-RED-001","quantity":1000}]'
  );
  const [scanStatus, setScanStatus] = useState("idle"); // idle | pending | matched | discrepancy | error
  const [scanMessage, setScanMessage] = useState("");
  const [scanTxHash, setScanTxHash] = useState(null);

  // --- Confirm form state ---
  const [confirmOrderId, setConfirmOrderId] = useState("");
  const [confirmStatus, setConfirmStatus] = useState("idle");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmTxHash, setConfirmTxHash] = useState(null);

  async function onScanPallet() {
    setScanStatus("pending");
    setScanMessage("Waiting for MetaMask...");
    setScanTxHash(null);

    try {
      const scanned = JSON.parse(scannedJson);
      if (!Array.isArray(scanned) || scanned.length === 0) {
        throw new Error("Scanned items must be a non-empty array");
      }

      const { signer } = await connectWallet();
      const delivery = getDeliveryContract(signer);

      setScanMessage("Sending scanPallet transaction...");
      const tx = await delivery.scanPallet(Number(scanOrderId), scanned);
      setScanTxHash(tx.hash);

      setScanMessage("Waiting for block confirmation...");
      const receipt = await tx.wait();

      // Walk the logs and find whichever event fired.
      let matched = false;
      let discrepancyReason = null;
      for (const log of receipt.logs) {
        try {
          const parsed = delivery.interface.parseLog(log);
          if (parsed?.name === "PalletScanned") matched = parsed.args.matched;
          if (parsed?.name === "DiscrepancyDetected") discrepancyReason = parsed.args.reason;
        } catch (_) { /* not our event */ }
      }

      if (discrepancyReason) {
        setScanStatus("discrepancy");
        setScanMessage(`Discrepancy detected: ${discrepancyReason}`);
      } else if (matched) {
        setScanStatus("matched");
        setScanMessage(`Pallet verified — order ${scanOrderId} now InTransit.`);
      } else {
        setScanStatus("error");
        setScanMessage("Transaction mined but no matching event found.");
      }
    } catch (e) {
      setScanStatus("error");
      setScanMessage(e.shortMessage || e.message || String(e));
    }
  }

  async function onConfirmDelivery() {
    setConfirmStatus("pending");
    setConfirmMessage("Waiting for MetaMask...");
    setConfirmTxHash(null);

    try {
      const { signer } = await connectWallet();
      const delivery = getDeliveryContract(signer);

      setConfirmMessage("Sending confirmDelivery transaction...");
      const tx = await delivery.confirmDelivery(Number(confirmOrderId));
      setConfirmTxHash(tx.hash);

      setConfirmMessage("Waiting for block confirmation...");
      const receipt = await tx.wait();

      // We expect a DeliveryConfirmed event.
      let confirmed = false;
      for (const log of receipt.logs) {
        try {
          const parsed = delivery.interface.parseLog(log);
          if (parsed?.name === "DeliveryConfirmed") confirmed = true;
        } catch (_) { /* not our event */ }
      }

      if (confirmed) {
        setConfirmStatus("success");
        setConfirmMessage(`Order ${confirmOrderId} confirmed as Delivered.`);
      } else {
        setConfirmStatus("error");
        setConfirmMessage("Transaction mined but no DeliveryConfirmed event found.");
      }
    } catch (e) {
      setConfirmStatus("error");
      setConfirmMessage(e.shortMessage || e.message || String(e));
    }
  }

  function copy(value) {
    navigator.clipboard.writeText(value);
  }

  // Pick a colour for the status message based on state.
  function colourFor(status) {
    if (status === "error") return "#b91c1c";
    if (status === "discrepancy") return "#b45309";
    if (status === "matched" || status === "success") return "#15803d";
    return "#5b6b7c";
  }

  return (
    <>
      <h1>Driver</h1>
      <p className="subtitle">Scan pallets at the supplier yard. The contract verifies against the original order.</p>

      <div className="card">
        <h2>Scan pallets</h2>

        <label>Order ID</label>
        <input
          placeholder="0"
          value={scanOrderId}
          onChange={(e) => setScanOrderId(e.target.value)}
        />

        <label>Scanned items (JSON array of sku + quantity)</label>
        <textarea
          rows={4}
          value={scannedJson}
          onChange={(e) => setScannedJson(e.target.value)}
        />

        <button onClick={onScanPallet} disabled={scanStatus === "pending"}>
          {scanStatus === "pending" && <span className="spinner"></span>}
          {scanStatus === "pending" ? "Working..." : "Scan & verify"}
        </button>

        {scanMessage && (
          <p style={{ marginTop: "1rem", color: colourFor(scanStatus) }}>
            {scanMessage}
          </p>
        )}

        {scanTxHash && (
          <div className="tx-hash">
            <span>Tx:</span>
            <code>{scanTxHash}</code>
            <button className="copy-btn" onClick={() => copy(scanTxHash)}>Copy</button>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Confirm delivery at site</h2>

        <label>Order ID</label>
        <input
          placeholder="0"
          value={confirmOrderId}
          onChange={(e) => setConfirmOrderId(e.target.value)}
        />

        <button onClick={onConfirmDelivery} disabled={confirmStatus === "pending"}>
          {confirmStatus === "pending" && <span className="spinner"></span>}
          {confirmStatus === "pending" ? "Working..." : "Confirm at site"}
        </button>

        {confirmMessage && (
          <p style={{ marginTop: "1rem", color: colourFor(confirmStatus) }}>
            {confirmMessage}
          </p>
        )}

        {confirmTxHash && (
          <div className="tx-hash">
            <span>Tx:</span>
            <code>{confirmTxHash}</code>
            <button className="copy-btn" onClick={() => copy(confirmTxHash)}>Copy</button>
          </div>
        )}
      </div>
    </>
  );
}
