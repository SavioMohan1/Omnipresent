import "server-only";

import { CosmosClient } from "@azure/cosmos";

import { getAzureCredential } from "@/lib/azure/credential";
import { getServerEnv } from "@/lib/config/env";

let client: CosmosClient | undefined;

export function getCosmosClient(): CosmosClient {
  if (client) {
    return client;
  }

  const endpoint = getServerEnv().COSMOS_ENDPOINT;
  if (!endpoint) {
    throw new Error("COSMOS_ENDPOINT is not configured.");
  }

  client = new CosmosClient({
    endpoint,
    aadCredentials: getAzureCredential(),
  });

  return client;
}

export function getCosmosDatabase() {
  const env = getServerEnv();
  return getCosmosClient().database(env.COSMOS_DATABASE);
}
