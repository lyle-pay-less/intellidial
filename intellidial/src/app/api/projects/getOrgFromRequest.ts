import { NextRequest } from "next/server";
import { getUserOrganization } from "@/lib/data/store";

export async function getOrgFromRequest(
  req: NextRequest
): Promise<{ userId: string; orgId: string } | null> {
  const userId = req.headers.get("x-user-id");
  if (!userId) return null;
  const orgId = await getUserOrganization(userId);
  if (!orgId) return null;
  return { userId, orgId };
}
