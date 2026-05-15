const PAY_TO = process.env.X402_PAY_TO ?? "0xa48E7e7D36EE1aE069B17D4E5E0B8a488c44B95a";
const NETWORK = "eip155:8453";

export function getX402Server() {
  return null;
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
