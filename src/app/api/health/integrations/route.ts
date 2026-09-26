import { getIntegrationConfigurationStatus } from "@/lib/config/env";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    status: "ok",
    configured: getIntegrationConfigurationStatus(),
  });
}
