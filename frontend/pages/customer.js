// Customer role page — read-only view of an order and its delivery.
// Reads OrderContract.getOrder(id) and DeliveryContract.getDelivery(id) and renders
// the lifecycle state plus per-item details. Also lists all known orders by reading
// nextOrderId from the contract and fetching each in turn.

import { useEffect, useState } from "react";
import { connectWallet, getOrderContract, getDeliveryContract } from "../lib/wallet";

// Enum labels (mirror the on-chain enums in the .sol files).
const ORDER_STATUS = ["Created", "InTransit", "Delivered", "Cancelled"];
const DELIVERY_STATUS = ["NotStarted", "Verified", "Discrepancy", "Confirmed"];

// Map status -> pill colour variant
const ORDER_STATUS_VARIANT = ["", "", "success", "danger"];     // Delivered = green, Cancelled = red
const DELIVERY_STATUS_VARIANT = ["", "", "warning", "success"]; // Discrepancy = amber, Confirmed = green

function fmtTimestamp(bigOrNum) {
  const n = Number(bigOrNum);
  if (!n) return "—";
  return new Date(n * 1000).toLocaleString();
}

export default function Customer() {
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [order, setOrder] = useState(null);
  const [delivery, setDelivery] = useState(null);

  // All-orders list state
  const [allOrders, setAllOrders] = useState([]);
  const [listLoading, setListLoading] = useState(false);

  // Load list on mount
  useEffect(() => {
    refreshOrderList();
  }, []);

  async function refreshOrderList() {
    setListLoading(true);
    try {
      const { provider } = await connectWallet();
      const orderContract = getOrderContract(provider);

      const count = Number(await orderContract.nextOrderId());
      const orders = [];
      for (let i = 0; i < count; i++) {
        try {
          const o = await orderContract.getOrder(i);
          orders.push({
            id: o.id.toString(),
            status: Number(o.status),
            buyer: o.buyer,
            supplier: o.supplier,
            itemCount: o.items.length,
          });
        } catch (_) { /* skip missing */ }
      }
      setAllOrders(orders);
    } catch (_) {
      // silent — list is best-effort
    } finally {
      setListLoading(false);
    }
  }

  async function onLoad(id) {
    const target = id ?? orderId;
    setOrderId(String(target));
    setLoading(true);
    setError(null);
    setOrder(null);
    setDelivery(null);

    try {
      const { provider } = await connectWallet();
      const orderContract = getOrderContract(provider);
      const deliveryContract = getDeliveryContract(provider);

      const n = Number(target);
      const o = await orderContract.getOrder(n);
      setOrder(o);

      try {
        const d = await deliveryContract.getDelivery(n);
        setDelivery(d);
      } catch (_) {
        setDelivery(null);
      }
    } catch (e) {
      setError(e.shortMessage || e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1>Customer</h1>
      <p className="subtitle">Track the status of your delivery — read-only view of on-chain state.</p>

      <div className="card">
        <h2>All orders on-chain</h2>
        <p className="subtitle" style={{ marginBottom: "0.75rem" }}>
          Every order ever created by Sales is shown here. Click one to load its
          full record below.
        </p>
        <button
          className="copy-btn"
          style={{
            background: "white",
            color: "var(--navy)",
            border: "1px solid var(--slate-300)",
            boxShadow: "none",
            fontSize: "0.78rem",
            padding: "0.4rem 0.7rem",
          }}
          onClick={refreshOrderList}
          disabled={listLoading}
        >
          {listLoading ? "Refreshing..." : "Refresh list"}
        </button>

        {allOrders.length === 0 && !listLoading && (
          <p style={{ marginTop: "1rem", color: "#5b6b7c" }}>
            No orders yet. Switch to the Sales role and create one.
          </p>
        )}

        {allOrders.length > 0 && (
          <div className="order-list">
            {allOrders.map((o) => (
              <div
                key={o.id}
                className="order-list-item"
                onClick={() => onLoad(o.id)}
              >
                <div>
                  <div className="order-id">Order #{o.id}</div>
                  <div className="order-meta">
                    {o.itemCount} item{o.itemCount === 1 ? "" : "s"} · supplier{" "}
                    {o.supplier.slice(0, 6)}...{o.supplier.slice(-4)}
                  </div>
                </div>
                <span className={`role-pill ${ORDER_STATUS_VARIANT[o.status]}`}>
                  {ORDER_STATUS[o.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Lookup by order ID</h2>
        <label>Order ID</label>
        <input
          placeholder="0"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
        />
        <button onClick={() => onLoad()} disabled={loading || !orderId}>
          {loading && <span className="spinner"></span>}
          {loading ? "Loading..." : "Load"}
        </button>
        {error && (
          <p style={{ marginTop: "1rem", color: "#b91c1c" }}>{error}</p>
        )}
      </div>

      {order && (
        <div className="card">
          <h2>Order #{order.id.toString()}</h2>
          <p><strong>Status:</strong> <span className={`role-pill ${ORDER_STATUS_VARIANT[Number(order.status)]}`}>{ORDER_STATUS[Number(order.status)]}</span></p>
          <p><strong>Buyer:</strong> <code>{order.buyer}</code></p>
          <p><strong>Supplier:</strong> <code>{order.supplier}</code></p>
          <p><strong>Required delivery:</strong> {fmtTimestamp(order.deliveryDate)}</p>
          <p><strong>Created:</strong> {fmtTimestamp(order.createdAt)}</p>

          <h3>Items</h3>
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it, i) => (
                <tr key={i}>
                  <td><code>{it.sku}</code></td>
                  <td>{it.quantity.toString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {delivery && Number(delivery.status) > 0 && (
        <div className="card">
          <h2>Delivery record</h2>
          <p><strong>Delivery status:</strong> <span className={`role-pill ${DELIVERY_STATUS_VARIANT[Number(delivery.status)]}`}>{DELIVERY_STATUS[Number(delivery.status)]}</span></p>
          <p><strong>Driver:</strong> <code>{delivery.driver}</code></p>
          <p><strong>Pallet verified at:</strong> {fmtTimestamp(delivery.verifiedAt)}</p>
          <p><strong>Delivered confirmed at:</strong> {fmtTimestamp(delivery.confirmedAt)}</p>
        </div>
      )}

      {order && (!delivery || Number(delivery.status) === 0) && (
        <div className="card">
          <p style={{ color: "#5b6b7c", margin: 0 }}>
            No delivery activity yet — the driver hasn't scanned this order.
          </p>
        </div>
      )}
    </>
  );
}
