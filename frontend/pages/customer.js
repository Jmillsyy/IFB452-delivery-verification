// Customer role page — read-only view of order status.
// PERSON B TODO: read OrderContract.getOrder(id) + DeliveryContract.getDelivery(id)
//                and render status + timestamps.

export default function Customer() {
  return (
    <>
      <h1>Customer</h1>
      <p className="subtitle">Track the status of your delivery — read-only view of on-chain state.</p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Lookup order (placeholder)</h2>
        <label>Order ID</label>
        <input placeholder="0" />
        <button disabled>Load (TODO Person B)</button>
      </div>
    </>
  );
}
