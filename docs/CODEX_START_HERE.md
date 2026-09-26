# CODEX START HERE - OnboardFlow AI

**Version:** 2.0  
**Purpose:** Implementation entrypoint for Codex  
**Build window:** 4 hours  
**Primary rule:** Build the complete P0 demo path before adding optional features.

---

# 1. Read order

Before touching code, read these files completely:

1. `FSD.md`
2. `TECHNICAL_APPROACH.md`
3. this file again

Do not start from a generic HR dashboard template.

The product is **not** a standalone HR chatbot and **not** a replacement HRIS.

It is an **HRIS-agnostic intelligent onboarding orchestration layer**.

---

# 2. Product in one sentence

> OnboardFlow AI receives a new employee from an HRIS boundary, uses AI to compile a context-specific onboarding task graph from company policies, validates and audits the graph, requires HR approval, then orchestrates parallel work across Security, IT, Manager, and Cafeteria while giving the employee and HR live state-aware guidance.

---

# 3. The USP Codex must preserve in implementation

The demo must clearly prove these four things:

1. **System of Record vs System of Action**  
   HRIS owns employee master data; OnboardFlow owns onboarding execution.

2. **AI Onboarding Compiler**  
   AI dynamically determines the proposed onboarding graph from employee context and policy. Complete task arrays must not be hardcoded.

3. **Parallel cross-functional execution**  
   Security, IT, Manager, and Cafeteria can work simultaneously when dependencies allow.

4. **State-aware intelligence with low token waste**  
   Exact facts come from DB/rules/graph logic first. AI is used only when reasoning or policy interpretation is needed.

If the implementation loses any of these, it is drifting away from the product thesis.

---

# 4. Existing Azure context

Carry forward the known project context:

- Azure credit ceiling: **INR 9,555**.
- Prior Azure policy restricted which regions could be used.
- Previously reported allowed regions:
  - `southeastasia`
  - `koreacentral`
  - `austriaeast`
  - `eastasia`
  - `uaenorth`
- A GPT-5 mini deployment was previously configured and rate limits were set.

Do not blindly recreate resources.

First inspect the active subscription and reuse healthy resources where appropriate.

Do not create a resource in a region outside the currently verified Azure policy simply because sample documentation uses that region.

---

# 5. First 20 minutes - mandatory

Before building UI:

1. inspect repository;
2. inspect Azure CLI login/subscription;
3. inspect current allowed locations/policy if available;
4. list existing Azure OpenAI / Foundry deployments;
5. locate and smoke-test the existing GPT-5 mini deployment if present;
6. verify Structured Output support using a tiny JSON schema request;
7. locate or provision Cosmos DB Serverless in a permitted supported region;
8. perform a real Cosmos write/read smoke test;
9. configure `.env.local` without committing secrets.

Do not continue to rich UI until AI + persistence work.

---

# 6. Canonical end-to-end demo

This is the path to optimize for:

```text
Synthetic HRIS employee.created event
        |
        v
Canonical employee + DRAFT onboarding
        |
        v
HR clicks Generate AI Plan
        |
        v
Azure AI compiles role-specific onboarding graph
        |
        v
Deterministic policy/graph validation
        |
        v
Optional AI Workflow Auditor
        |
        v
HR reviews + approves
        |
        +--------------+--------------+--------------+
        |              |              |              |
        v              v              v              v
    Security           IT          Manager       Cafeteria
        |              |              |              |
        +--------------+--------------+--------------+
                       |
                       v
                 Persisted live state
                  /               \
                 v                 v
          Employee journey      HR Command Center
                 |
                 v
          State-aware Copilot
```

Do not substitute a fake HRIS vendor logo/button for the synthetic connector and claim it is connected.

---

# 7. P0 features - non-negotiable

P0 must include:

- [ ] real authenticated demo roles;
- [ ] server-side RBAC;
- [ ] Demo HRIS Connector with idempotent synthetic employee event;
- [ ] canonical employee model;
- [ ] real Azure AI onboarding-plan generation;
- [ ] strict schema validation;
- [ ] deterministic policy/graph validation;
- [ ] HR plan review;
- [ ] HR approval before task activation;
- [ ] persisted stakeholder tasks;
- [ ] Security queue;
- [ ] IT queue;
- [ ] Manager queue;
- [ ] Cafeteria queue;
- [ ] start/block/complete actions;
- [ ] employee progress/current/next step;
- [ ] HR global progress/blocker visibility;
- [ ] audit timeline;
- [ ] state-aware Copilot answer for `Is my laptop ready?`;
- [ ] answer changes after IT task completion;
- [ ] demo reset/seed path.

---

# 8. P1 order

Only after P0 works:

1. AI Workflow Auditor;
2. keyword policy retrieval if not already done;
3. vector + RRF hybrid retrieval if embedding deployment is immediately available;
4. blocker-impact AI explanation;
5. Azure Communication Services email;
6. HR AI bottleneck summary;
7. AI token-usage diagnostics UI.

---

# 9. The AI must be central, but bounded

## AI does

- compile role/location/type-specific onboarding tasks;
- explain why each task exists;
- audit proposed plans for omissions/inconsistency;
- interpret retrieved policy;
- explain live blockers;
- summarize computed operational metrics.

## AI does not

- authenticate users;
- authorize access;
- calculate progress;
- decide task ownership from client input;
- grant physical or privileged access;
- mark stakeholder work complete;
- create a fake success state;
- make compensation/performance/promotion/termination decisions.

---

# 10. AI efficiency rule

Use this escalation order for Copilot requests:

```text
1. DB/state lookup
2. deterministic rules / dependency graph
3. metadata filters
4. BM25/keyword retrieval
5. vector retrieval (if enabled)
6. RRF top-k context
7. generative model only if needed
```

Examples:

- `Who is my manager?` -> DB.
- `Is my laptop ready?` -> task state.
- `What should I do next?` -> dependency graph.
- `What does the lab-access policy mean for me?` -> retrieval + model.

Do not call GPT merely to convert `COMPLETED` into the sentence `Your laptop is ready.`

---

# 11. HRIS contract

The prototype must use a generic adapter boundary.

Implement:

```ts
interface HRISConnector {
  provider: string;
  normalizeInboundEvent(payload: unknown): Promise<CanonicalHRISEvent>;
  getEmployee?(externalEmployeeId: string): Promise<CanonicalEmployee>;
  syncOnboardingStatus?(
    externalEmployeeId: string,
    status: OnboardingStatus,
  ): Promise<void>;
}
```

P0 connector:

```text
DemoHRISConnector
```

Endpoint:

```text
POST /api/integrations/hris/demo/events
```

Use a synthetic event. Label it clearly as demo integration.

Do **not** build guessed Workday/SAP/Darwinbox adapters without a real tenant/schema.

---

# 12. HRIS mapping philosophy

All external HRIS schemas map to one internal model:

```text
Workday -----------\
SuccessFactors -----\
BambooHR ------------> CanonicalEmployee -> OnboardFlow
Darwinbox ----------/
Demo HRIS ---------/
```

The core workflow engine must never depend on a vendor-specific field name.

---

# 13. AI compiler rules

Generated tasks must include:

- stakeholder;
- category;
- title;
- description;
- instructions;
- priority;
- required flag;
- reason;
- policy references;
- explicit dependencies.

Allowed stakeholders only:

```text
HR
MANAGER
SECURITY
IT
CAFETERIA
```

Prefer parallel tasks.

Add dependencies only when they are actually required by policy or task logic.

The model must never say access is granted; it may only create a request for authorized staff to act on.

---

# 14. Workflow Auditor

If implemented, keep it independent from the compiler.

It receives the normalized plan + employee context + policy context and returns findings only.

It cannot mutate tasks automatically.

HR decides whether to apply a suggestion.

Run deterministic validation again after any edit.

---

# 15. Retrieval implementation

Do not provision Azure AI Search for the four-hour P0 build.

P0:

- metadata filtering;
- local BM25/keyword retrieval.

P1 when embedding deployment is ready:

- precompute policy embeddings;
- vector cosine search;
- fuse keyword + vector rank lists using RRF;
- send only top 3-5 chunks to the model.

Do not send entire policy files into every Copilot request.

---

# 16. Implementation gates

## Gate A - Azure

Pass only when:

- real model request succeeds;
- real Cosmos write/read succeeds;
- secrets remain server-only.

## Gate B - Auth/RBAC

Pass only when:

- HR login works;
- Employee login works;
- Security login works;
- IT login works;
- unauthorized direct API access is denied.

## Gate C - HRIS

Pass only when:

- synthetic employee event creates onboarding;
- duplicate event does not duplicate employee/onboarding.

## Gate D - AI compiler

Pass only when:

- Backend Engineer plan comes from real Azure AI;
- Sales Executive plan comes from real Azure AI;
- output validates;
- plans differ meaningfully;
- tasks remain inactive before HR approval.

## Gate E - Workflow

Pass only when:

- approval creates tasks;
- role queues are restricted;
- updates persist;
- audit event persists;
- progress recalculates.

## Gate F - Employee/HR views

Pass only when:

- employee progress reflects real state;
- HR sees same state;
- blocker/owner is visible.

## Gate G - Copilot

Pass only when:

- `Is my laptop ready?` reads task state;
- answer changes after IT completion;
- hardcoded demo response is not used.

---

# 17. Time plan

```text
00:00-00:20 Azure preflight + AI/Cosmos smoke tests
00:20-00:50 Auth + data repositories + demo users
00:50-01:15 HRIS connector + DRAFT onboarding
01:15-01:55 AI compiler + validation + HR review/approval
01:55-02:35 Stakeholder queues + transitions + audit
02:35-03:05 Employee journey + HR Command Center
03:05-03:30 Copilot + retrieval
03:30-03:45 Auditor / blocker intelligence / email
03:45-04:00 Freeze, reset, demo rehearsal, Vercel deploy if stable
```

At 04:00 stop adding features.

---

# 18. Cut order

If behind:

1. email;
2. charts;
3. HR bottleneck narrative;
4. vector retrieval;
5. blocker AI narrative;
6. Workflow Auditor if necessary.

Never cut:

- Azure AI compiler;
- HRIS demo boundary;
- HR approval;
- persisted tasks;
- RBAC;
- employee progress;
- HR visibility;
- state-aware Copilot.

---

# 19. No-fake rules

Do not:

- hardcode complete AI-generated plans;
- hardcode Copilot demo answers;
- display `email sent` when email failed/skipped;
- display `Workday connected` when no Workday tenant is connected;
- claim Azure AI Search if retrieval runs locally;
- claim a neural prediction model when none was trained;
- claim cost savings that were not measured;
- claim retrieval accuracy without running the evaluation script.

---

# 20. External API uncertainty rule

If an SDK signature, Azure API version, model capability, deployment type, or vendor HRIS API field is uncertain:

1. verify official documentation;
2. inspect the real subscription/tenant when applicable;
3. implement only what is verified;
4. document the limitation.

Do not guess.

---

# 21. Demo accounts and synthetic data

Create at minimum:

- HR user;
- Employee Aarav Sharma - Backend Engineer;
- Manager Priya Nair;
- Security user;
- IT user;
- Cafeteria user;
- optional Employee Meera Shah - Sales Executive for AI-plan comparison.

All email addresses must use synthetic/demo values.

---

# 22. Final build objective

By the time coding stops, the judge must be able to watch this happen live:

> A synthetic HRIS event creates a new employee. Azure AI dynamically compiles a policy-grounded onboarding graph. HR reviews and approves it. Security and IT receive different authorized work queues. Their actions change one persisted source of truth. The employee sees those changes and asks a Copilot question that is answered from live workflow state rather than a canned response. HR can immediately identify the remaining blocker and see the audit trail.

Anything that does not strengthen this path is secondary.
