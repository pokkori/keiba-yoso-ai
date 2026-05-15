import { x402ResourceServer, HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";

const PAY_TO = process.env.X402_PAY_TO ?? "0xa48E7e7D36EE1aE069B17D4E5E0B8a488c44B95a";
const NETWORK = "eip155:8453"; // Base Mainnet

let _server: ReturnType<typeof buildServer> | null = null;

function buildServer() {
  const facilitator = new HTTPFacilitatorClient({ url: "https://facilitator.x402.org" });
  return new x402ResourceServer(facilitator).register(NETWORK, new ExactEvmScheme());
}

export function getX402Server() {
  if (!_server) _server = buildServer();
  return _server;
}

export const X402_ROUTE_CONFIG = {
  accepts: {
    scheme: "exact" as const,
    price: "$0.05",
    network: NETWORK,
    payTo: PAY_TO,
    maxTimeoutSeconds: 120,
  },
  description: "競馬予想AI - 1レース予測 ($0.05 USDC on Base)",
};
