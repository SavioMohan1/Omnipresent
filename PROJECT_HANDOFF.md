# OnboardFlow Project Handoff

Last updated: 2026-09-26

## Objective

Build the OnboardFlow MVP described in `CODEX_START_HERE.md`, using a Next.js application with Azure OpenAI and Azure Cosmos DB integrations. The existing Bosch Django files under `D:\Projects\Omnipresent\intern\Bosch\Home\` are reference material only and have not been copied into this application.

## Repository location

`D:\Projects\Omnipresent\onboardflow`

The repository was initialized locally by `create-next-app`. It has not yet been published to GitHub.

## Work completed

- Created a Next.js 16.3.6 application using the App Router and TypeScript.
- Installed the integration dependencies:
  - `openai@7.23.0`
  - `@azure/identity@4.13.3`
  - `@azure/cosmos@4.10.1`
  - `zod@4.6.5`
  - `server-only@0.0.1`
  - `minisearch@7.2.0`
  - `bcryptjs@3.0.3`
- Added server-only, validated environment configuration in `src/lib/config/env.ts`.
- Added an Azure credential factory in `src/lib/azure/credential.ts`.
  - Uses `ClientSecretCredential` when the three service-principal variables are present.
  - Otherwise falls back to `DefaultAzureCredential`.
- Added an Azure OpenAI client in `src/lib/azure/openai.ts`.
  - Uses Microsoft Entra bearer-token authentication.
  - Uses the `https://cognitiveservices.azure.com/.default` scope.
  - Normalizes the configured endpoint to the Azure OpenAI `/openai/v1/` base URL.
- Added a Cosmos DB client in `src/lib/azure/cosmos.ts`, also using Entra authentication.
- Added `GET /api/health/integrations` in `src/app/api/health/integrations/route.ts`.
  - Reports only configuration booleans.
  - Does not expose credential values.
- Added `.env.example` with empty placeholders and safe defaults.
- Updated `.gitignore` so `.env.example` is tracked while actual `.env*` secret files remain ignored.
- Added the Ruflo execution plan in `docs/RUFLO_PLAN.md`.

## Verification completed

From `D:\Projects\Omnipresent\onboardflow`:

```powershell
npm run lint
npm run build
npm audit
```

Results:

- Lint passed.
- Production build passed.
- `npm audit` reported zero vulnerabilities.
- The build includes `/`, `/_not-found`, and `/api/health/integrations`.
- `git diff --check` found no patch errors; it only reported expected Windows LF-to-CRLF warnings.
- Neither `Azure API resources.txt` nor `.env.local` is tracked by Git.

## Azure state

Existing Azure resources discovered:

- Resource group: `diablo`
- Azure AI/Foundry resource: `ChatbotSavio`
- Foundry project: `proj-default`
- Azure OpenAI endpoint: `https://chatbotsavio.openai.azure.com/openai/v1/`
- Model deployment: `gpt-5-mini`
- No Cosmos DB resource existed at the time of inspection.

The local credential document is:

`D:\Projects\Omnipresent\Azure API resources.txt`

It contains the service-principal tenant ID, client ID, client secret, subscription ID, and related Azure information. **Do not copy it into the repository, commit it, paste it into chat, or include it in logs. Rotate the secret after the project work is complete.**

Credential validation showed:

- The service principal could obtain an Entra token, so the tenant/client/secret combination was valid.
- Azure Resource Manager resource listing returned HTTP 403 because the service principal did not have ARM read access.
- Before the role assignment, Azure OpenAI inference returned HTTP 401 because the service principal did not yet have the required inference role. This result is historical and must now be retested.

### Azure role assignment completed by the user

The user confirmed that the following assignment was reviewed and submitted in Azure IAM:

- Scope: the `ChatbotSavio` resource
- Role: `Cognitive Services OpenAI User`
- Member type: `User, group, or service principal`
- Member: `onboardflow-codex`
- Object type: `App`

This is the intended least-privilege inference role. The role-assignment workflow is complete. Live inference has not yet been retested, so allow for normal Azure RBAC propagation and verify the permission with a real structured-output request before treating Gate A as passed.

Do not grant `Owner`, `Contributor`, `Azure AI Administrator`, or key-management permissions unless the architecture genuinely requires them.

## Supabase state

The Supabase connector is authenticated. It exposes one existing healthy project belonging to the user's ReferKaro work. It was deliberately left unchanged because the current OnboardFlow design specifies Azure Cosmos DB and the existing Supabase project appears unrelated.

Do not create tables, policies, or migrations in that Supabase project unless the user explicitly changes the architecture or identifies a dedicated project.

## GitHub state

- GitHub is authenticated as the user's personal account.
- The intended repository name `onboardflow` appeared available when checked.
- The connector can work with repository contents and pull requests, but could not create a new repository.
- GitHub CLI (`gh`) was not installed at the time of inspection.
- Create the repository through GitHub's UI or install/authenticate `gh`, then add the remote and push the local Git history.
- Never commit `Azure API resources.txt`, `.env.local`, secrets, tokens, or generated credential output.

## Ruflo and local GPU

- Ruflo CLI is installed globally at version 3.38.21; a newer npm version was available when checked.
- Ruflo has not been initialized in this repository.
- Initializing it would create Ruflo orchestration files, so this was left pending explicit approval.
- The machine has an NVIDIA RTX 3060 Laptop GPU with approximately 6 GB VRAM.
- Ollama 0.30.6 is installed, but no model was installed and its service was not left running.
- Native Codex subagents do not execute on the local GPU.
- GPU-backed Ruflo agents would require an appropriately small quantized Ollama model, starting Ollama, initializing Ruflo, and configuring the Ollama provider. Do not enable daemons, federation, autopilot, remote memory, or credential-bearing integrations without explicit approval.

## Internet research conclusions

Official Microsoft guidance used for the integration:

- Prefer Microsoft Entra ID/keyless authentication over embedding Azure API keys.
- Azure OpenAI's current JavaScript path uses the `openai` package with `@azure/identity`.
- The Responses API uses the Azure OpenAI v1 endpoint.
- Structured output for Responses is configured through `text.format`.
- The deployed `gpt-5-mini` model supports the intended structured-output workflow when a supported model version is deployed.

Relevant documentation:

- <https://learn.microsoft.com/en-us/azure/developer/ai/keyless-connections>
- <https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/responses>
- <https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/structured-outputs>
- <https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-javascript-get-started>

## Current uncommitted files

Expected working-tree changes include:

- `.gitignore`
- `.env.example`
- `package.json`
- `package-lock.json`
- `docs/RUFLO_PLAN.md`
- `src/app/api/health/integrations/route.ts`
- `src/lib/config/env.ts`
- `src/lib/azure/credential.ts`
- `src/lib/azure/openai.ts`
- `src/lib/azure/cosmos.ts`
- this handoff file

Inspect `git status` and the diff before committing. Preserve any unrelated user changes.

## Recommended next steps

1. Allow for Azure RBAC propagation, then test Azure OpenAI from a one-off process that loads the credential document without printing or persisting its values.
2. Verify a real GPT-5-mini Responses API call with a small Structured Output schema.
3. If inference succeeds, implement a typed server-side generation service using Zod and Azure Responses structured output.
4. Confirm the required Cosmos DB account name, region, throughput mode, and acceptable cost with the user before creating the resource.
5. Create Cosmos containers and partition-key design only after reviewing `CODEX_START_HERE.md` requirements. Use Entra roles instead of account keys where possible.
6. Build the MVP feature flow, authentication, persistence, and UI in small verified slices.
7. Add unit tests and integration tests around environment validation, model-output parsing, and persistence boundaries.
8. Create the GitHub repository, perform a secret scan, commit the reviewed changes, and push.
9. Rotate the service-principal client secret after integration work is complete.

## Security rules for the next agent

- Never print, summarize, or commit credential values from `Azure API resources.txt`.
- Do not place secrets in client components or variables prefixed with `NEXT_PUBLIC_`.
- Keep Azure SDK and OpenAI calls in server-only modules or route handlers.
- Do not create billable Azure resources or broaden IAM permissions without explicit user approval.
- Confirm immediately before submitting permission changes, creating persistent credentials, or performing other consequential cloud actions through browser automation.
- Run a secret scan before every GitHub push.
