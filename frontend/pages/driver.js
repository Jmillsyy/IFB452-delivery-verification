// Driver role page — scan pallets at the supplier.
// PERSON B TODO: call DeliveryContract.scanPallet(orderId, scannedItems)
//                On success: PalletScanned(matched=true). On mismatch: DiscrepancyDetected.

export default function Driver() {
  return (
    <>
      <h1>Driver</h1>
      <p className="subtitle">Scan pallets at the supplier yard. The contract verifies against the original order.</p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Scan pallets (placeholder)</h2>
        <label>Order ID</label>
        <input placeholder="0" />
        <label>Scanned items (sku, quantity)</label>
        <textarea rows={4} placeholder='[{"sku":"BRICK-RED-001","quantity":1000},{"sku":"CEMENT-50KG","quantity":20}]' />
        <button disabled>Scan &amp; verify (TODO Person B)</button>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Confirm delivery (placeholder)</h2>
        <label>Order ID</label>
        <input placeholder="0" />
        <button disabled>Confirm at site (TODO Person B)</button>
      </div>
    </>
  );
}
