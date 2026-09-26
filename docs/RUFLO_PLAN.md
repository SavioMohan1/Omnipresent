# Ruflo Delivery Plan

## Mode

Ruflo protocol mode without project initialization. The installed Ruflo CLI is not initialized in this repository, and no daemon, hooks, federation, remote memory, autopilot, or credential-bearing agent access is enabled.

Native parallel agents are used only for bounded, non-secret preflight work because the user explicitly requested parallel subagents. Azure credentials remain restricted to the primary execution path.

## Objective

Deliver the P0 OnboardFlow demo path: synthetic HRIS event, AI-compiled and policy-validated task graph, HR approval, parallel stakeholder execution, persisted audit/progress state, and a live-state employee Copilot.

## Stages and ownership

| Stage | Owner | Acceptance criteria |
| --- | --- | --- |
| Planning and preflight | Primary | Clean repository; secrets excluded; Azure, GitHub, database, GPU, and runtime facts recorded |
| Integration foundation | Primary | Server-only Azure identity, OpenAI, and Cosmos clients compile; configuration status endpoint exposes no values |
| Application implementation | Primary | P0 routes, workflows, RBAC, UI, and reset path work end to end |
| Test-gap review | Independent agent | Missing authorization, idempotency, graph, failure-path, and state-transition tests identified |
| Security/risk review | Independent agent | No client secrets in bundles or Git; role and ownership checks enforced on every protected path |
| Final verification | Primary | Lint, typecheck/build, tests, browser demo, Azure AI smoke test, Cosmos write/read, and Git history secret scan pass |

## Current evidence

- Next.js 16.3.6 scaffold created with TypeScript, App Router, Tailwind CSS, ESLint, and npm lockfile.
- Node.js 24.14.1 satisfies Next.js and Azure SDK requirements.
- Azure subscription is active and the existing Foundry resource is healthy in Southeast Asia.
- Existing model deployment: `gpt-5-mini`.
- Supplied service principal obtains an Entra token but currently receives 403 for ARM resource-group listing and 401 for Azure OpenAI inference.
- No Cosmos DB resource is currently present in the subscription resource inventory.
- GitHub connector is authenticated; `SavioMohan1/onboardflow` does not exist yet; connector cannot create repositories.
- Supabase is connected but its only project belongs to ReferKaro and remains untouched. P0 retains Cosmos per the functional specification.
- RTX 3060 Laptop GPU and Ollama are available, but no local model is installed and Ruflo is not initialized; GPU-backed agents are therefore not active.

## Immediate blockers

1. Grant the application identity `Cognitive Services OpenAI User` on the Foundry resource, or provide an approved server-side resource key.
2. Provision or identify a Cosmos DB for NoSQL Serverless account in a currently permitted region, then grant a data-plane role to the application identity.
3. Create the GitHub repository through the GitHub UI or install/authenticate GitHub CLI when the local build is ready to push.

## Safety boundaries

- `Azure API resources.txt` stays outside this repository.
- No secrets are printed, committed, sent to agents, or stored in Ruflo memory.
- All Azure modules are server-only.
- Supabase resources receive no writes unless the architecture is explicitly revised.
- GPU/Ruflo initialization and model downloads require a separate explicit setup decision.
