import "server-only";

import { getBearerTokenProvider } from "@azure/identity";
import OpenAI from "openai";

import { getAzureCredential } from "@/lib/azure/credential";
import { getServerEnv } from "@/lib/config/env";

let client: OpenAI | undefined;

function normalizeBaseUrl(endpoint: string): string {
  const base = endpoint.replace(/\/+$/, "");
  return base.endsWith("/openai/v1") ? `${base}/` : `${base}/openai/v1/`;
}

export async function getAzureOpenAIClient(): Promise<OpenAI> {
  if (client) {
    return client;
  }

  const env = getServerEnv();
  if (!env.AZURE_OPENAI_ENDPOINT || !env.AZURE_OPENAI_DEPLOYMENT) {
    throw new Error("Azure OpenAI is not configured.");
  }

  const tokenProvider = getBearerTokenProvider(
    getAzureCredential(),
    "https://cognitiveservices.azure.com/.default",
  );

  client = new OpenAI({
    apiKey: await tokenProvider(),
    baseURL: normalizeBaseUrl(env.AZURE_OPENAI_ENDPOINT),
  });

  return client;
}

export function getAzureOpenAIDeployment(): string {
  const deployment = getServerEnv().AZURE_OPENAI_DEPLOYMENT;
  if (!deployment) {
    throw new Error("AZURE_OPENAI_DEPLOYMENT is not configured.");
  }

  return deployment;
}
