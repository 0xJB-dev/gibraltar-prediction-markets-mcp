import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(_req: VercelRequest, res: VercelResponse): void {
  res.status(200).json({
    status: "ok",
    server: "gibraltar-prediction-markets",
    transport: "streamable-http",
    stateless: true,
  });
}
