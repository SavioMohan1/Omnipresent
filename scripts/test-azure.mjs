import fs from 'node:fs';
import path from 'node:path';
import { ClientSecretCredential, getBearerTokenProvider } from '@azure/identity';
import OpenAI from 'openai';

async function main() {
  console.log('--- Step 1: Parsing credentials safely in-memory ---');
  const credPath = path.resolve('..', 'Azure API resources.txt');
  if (!fs.existsSync(credPath)) {
    console.error('Cannot find:', credPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(credPath, 'utf-8');
  const lines = raw.split(/\r?\n/);
  
  let tenantId = '';
  let clientId = '';
  let clientSecret = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('Application (client) ID')) {
      const next = lines[i + 1]?.trim();
      if (next && !next.includes(':')) clientId = next;
      else clientId = line.split(':')[1]?.trim() || '';
    } else if (line.includes('Directory (tenant) ID')) {
      const next = lines[i + 1]?.trim();
      if (next && !next.includes(':')) tenantId = next;
      else tenantId = line.split(':')[1]?.trim() || '';
    } else if (line.toLowerCase().startsWith('value') || line.toLowerCase().includes('secret id and value')) {
      if (line.toLowerCase().startsWith('value')) {
        const val = line.split(/[:=]/)[1]?.trim();
        if (val) clientSecret = val;
      }
    }
  }

  for (const line of lines) {
    const parts = line.split(/[:=]/).map(s => s.trim());
    if (parts[0] === 'Value' && parts[1]) {
      clientSecret = parts[1];
    }
  }

  const endpoint = 'https://chatbotsavio.openai.azure.com/openai/v1/';
  const deployment = 'gpt-5-mini';

  console.log('Tenant ID detected:', tenantId ? 'YES (' + tenantId.substring(0, 4) + '...)' : 'NO');
  console.log('Client ID detected:', clientId ? 'YES (' + clientId.substring(0, 4) + '...)' : 'NO');
  console.log('Secret detected:', clientSecret ? 'YES (length: ' + clientSecret.length + ')' : 'NO');
  console.log('Endpoint:', endpoint);
  console.log('Deployment:', deployment);

  if (!tenantId || !clientId || !clientSecret) {
    console.error('Failed to parse all credentials from Azure API resources.txt');
    process.exit(1);
  }

  console.log('\n--- Step 2: Testing Entra Token Retrieval ---');
  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
  const scope = 'https://cognitiveservices.azure.com/.default';
  
  try {
    const token = await credential.getToken(scope);
    console.log('Token successfully acquired! Expires at:', new Date(token.expiresOnTimestamp).toISOString());
  } catch (err) {
    console.error('Failed to acquire Entra token:', err.message);
    process.exit(1);
  }

  console.log('\n--- Step 3: Testing Azure OpenAI Inference (Gate A Smoke Test) ---');
  const tokenProvider = getBearerTokenProvider(credential, scope);

  const openai = new OpenAI({
    apiKey: await tokenProvider(),
    baseURL: endpoint,
  });

  try {
    console.log('Attempting chat.completions.create with deployment:', deployment);
    const completion = await openai.chat.completions.create({
      model: deployment,
      messages: [
        { role: 'system', content: 'You are an onboarding assistant. Output in valid JSON only.' },
        { role: 'user', content: 'Return a JSON object with keys "status" (string "online") and "service" (string "onboardflow-ai").' }
      ],
      response_format: { type: 'json_object' }
    });

    console.log('Success! Response received:');
    console.log('Model reported:', completion.model);
    console.log('Content:', completion.choices[0]?.message?.content);

    console.log('\n--- Step 4: Writing .env.local for Next.js ---');
    const envLocalContent = `# Local server-only environment
AUTH_SECRET=demo-auth-secret-change-in-production-12345
DEMO_HRIS_SECRET=demo-hris-secret-synthetic-events-67890

AZURE_TENANT_ID=${tenantId}
AZURE_CLIENT_ID=${clientId}
AZURE_CLIENT_SECRET=${clientSecret}

AZURE_OPENAI_ENDPOINT=${endpoint}
AZURE_OPENAI_DEPLOYMENT=${deployment}

COSMOS_DATABASE=onboardflow

ENABLE_PLAN_AUDITOR=false
ENABLE_VECTOR_RETRIEVAL=false
ENABLE_EMAIL=false
ENABLE_AI_USAGE_PANEL=true
`;

    fs.writeFileSync('.env.local', envLocalContent, 'utf-8');
    console.log('Created .env.local (Git-ignored).');
    console.log('\n>>> GATE A PASSED SUCCESSFULLY! <<<');

  } catch (inferenceErr) {
    console.error('Inference call failed:');
    console.error('Status:', inferenceErr.status);
    console.error('Code:', inferenceErr.code);
    console.error('Message:', inferenceErr.message);

    if (inferenceErr.status === 401 || inferenceErr.status === 403) {
      console.log('Note: If 401/403, RBAC role assignment may still be propagating (can take up to 5-10 minutes in Azure).');
    }
  }
}

main().catch(console.error);
