import "server-only";

import {
  ClientSecretCredential,
  DefaultAzureCredential,
  type TokenCredential,
} from "@azure/identity";

import { getServerEnv } from "@/lib/config/env";

let credential: TokenCredential | undefined;

export function getAzureCredential(): TokenCredential {
  if (credential) {
    return credential;
  }

  const env = getServerEnv();

  credential =
    env.AZURE_TENANT_ID && env.AZURE_CLIENT_ID && env.AZURE_CLIENT_SECRET
      ? new ClientSecretCredential(
          env.AZURE_TENANT_ID,
          env.AZURE_CLIENT_ID,
          env.AZURE_CLIENT_SECRET,
        )
      : new DefaultAzureCredential();

  return credential;
}
