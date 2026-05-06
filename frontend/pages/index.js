import { useState } from "react";
import { connectWallet, getMyRole } from "../lib/wallet";

export default function Home() {
  const [address, setAddress] = useState(null);
  const [role, setRole] = useState(null);
  const [error, setError] = useState(null);

  async function onConnect() {
    setError(null);
    try {
      const { provider, address } = await connectWallet();
      setAddress(address);
      const r = await getMyRole(provider, address);
      setRole(r);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <>
      <h1>Delivery Verification on the Blockchain</h1>
      <p className="subtitle">
        IFB452 group project — Solidity smart contracts on Ethereum, with role-based access for the
        building-products supply chain.
      </p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Connect your wallet</h2>
        {!address && (
          <button onClick={onConnect}>Connect MetaMask</button>
        )}
        {address && (
          <>
            <p>Connected: <code>{address}</code></p>
            {role && <p>Role: <span className="role-pill">{role.name}</span></p>}
          </>
        )}
        {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Demo flows</h2>
        <ol>
          <li><strong>Sales</strong> → create a customer order</li>
          <li><strong>Driver</strong> → scan pallets at the supplier (matching = verified, mismatch = discrepancy)</li>
          <li><strong>Customer</strong> → view final delivery status</li>
        </ol>
        <p style={{ color: "#5b6b7c" }}>
          Use the navigation above to switch between role-specific pages. Switch MetaMask
          accounts to act as different stakeholders.
        </p>
      </div>
    </>
  );
}
