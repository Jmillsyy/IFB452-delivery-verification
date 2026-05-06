// Sales role page — create a new customer order.
// PERSON B TODO: wire this up using getOrderContract(signer).createOrder(...)
//                Use lib/wallet.js helpers; see lib/contracts.js for the ABI shape.

export default function Sales() {
  return (
    <>
      <h1>Sales</h1>
      <p className="subtitle">Create a customer order. Recorded on-chain via OrderContract.createOrder().</p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>New order (placeholder)</h2>
        <label>Supplier address</label>
        <input placeholder="0x..." />
        <label>Items (sku, quantity)</label>
        <textarea rows={4} placeholder='[{"sku":"BRICK-RED-001","quantity":1000}]' />
        <label>Delivery date (unix timestamp)</label>
        <input placeholder="1716700000" />
        <button disabled>Create order (TODO Person B)</button>
      </div>
    </>
  );
}
