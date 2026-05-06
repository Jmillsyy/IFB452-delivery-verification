// Minimal MetaMask helper. Person B: extend as needed for the role-based pages.

import { BrowserProvider, Contract } from "ethers";
import {
  ORDER_CONTRACT_ADDRESS, ORDER_ABI,
  DELIVERY_CONTRACT_ADDRESS, DELIVERY_ABI,
  HARDHAT_CHAIN_ID, ROLE_NAMES,
} from "./contracts";

export async function connectWallet() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask not found — install the extension");
  }
  const provider = new BrowserProvider(window.ethereum);
  await window.ethereum.request({ method: "eth_requestAccounts" });
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== HARDHAT_CHAIN_ID) {
    throw new Error(
      `Wrong network. Switch MetaMask to Hardhat Local (chainId ${HARDHAT_CHAIN_ID}).`
    );
  }
  const signer = await provider.getSigner();
  return { provider, signer, address: await signer.getAddress() };
}

export function getOrderContract(signerOrProvider) {
  return new Contract(ORDER_CONTRACT_ADDRESS, ORDER_ABI, signerOrProvider);
}

export function getDeliveryContract(signerOrProvider) {
  return new Contract(DELIVERY_CONTRACT_ADDRESS, DELIVERY_ABI, signerOrProvider);
}

export async function getMyRole(provider, address) {
  const oc = getOrderContract(provider);
  const r = await oc.getRole(address);
  return { id: Number(r), name: ROLE_NAMES[Number(r)] };
}
