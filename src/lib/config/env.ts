import "server-only";

import { z } from "zod";

const nonEmptyOptional = z.string().trim().min(1).optional();

const serverEnvSchema = z.object({
  AZURE_TENANT_ID: nonEmptyOptional,
  AZURE_CLIENT_ID: nonEmptyOptional,
  AZURE_CLIENT_SECRET: nonEmptyOptional,
  AZURE_OPENAI_ENDPOINT: nonEmptyOptional,
  AZURE_OPENAI_DEPLOYMENT: nonEmptyOptional,
  COSMOS_ENDPOINT: nonEmptyOptional,
  COSMOS_DATABASE: z.string().trim().min(1).default("onboardflow"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  cachedEnv ??= serverEnvSchema.parse({
    AZURE_TENANT_ID: process.env.AZURE_TENANT_ID,
    AZURE_CLIENT_ID: process.env.AZURE_CLIENT_ID,
    AZURE_CLIENT_SECRET: process.env.AZURE_CLIENT_SECRET,
    AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_DEPLOYMENT: process.env.AZURE_OPENAI_DEPLOYMENT,
    COSMOS_ENDPOINT: process.env.COSMOS_ENDPOINT,
    COSMOS_DATABASE: process.env.COSMOS_DATABASE,
  });

  return cachedEnv;
}

export function getIntegrationConfigurationStatus() {
  const env = getServerEnv();

  return {
    azureIdentity: Boolean(
      env.AZURE_TENANT_ID &&
        env.AZURE_CLIENT_ID &&
        env.AZURE_CLIENT_SECRET,
    ),
    azureOpenAI: Boolean(
      env.AZURE_OPENAI_ENDPOINT && env.AZURE_OPENAI_DEPLOYMENT,
    ),
    cosmos: Boolean(env.COSMOS_ENDPOINT && env.COSMOS_DATABASE),
  } as const;
}
