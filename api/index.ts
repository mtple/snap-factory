import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.status(200).send(
    "snap factory — built by snap wizard\n" +
      "snaps live at /api/snaps/[name]\n" +
      "github.com/mtple/snap-factory\n",
  );
}
