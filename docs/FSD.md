# OnboardFlow AI - Functional Specification Document (FSD)

**Document version:** 2.0  
**Status:** Build-ready hackathon specification  
**Prepared for:** HR AI Challenge prototype  
**Prototype build window:** 4 hours  
**Presentation preparation window:** 30 minutes  
**Cloud budget ceiling:** INR 9,555 Azure credits (user-provided). Credit eligibility, current balance, service availability, regional policy, quota, and actual pricing must be verified in the active Azure subscription before provisioning.  
**Data policy:** Synthetic data only. No real confidential employee, candidate, compensation, performance, identity-document, health, or other personally identifiable information.  
**Working product name:** OnboardFlow AI  
**Product category:** Intelligent onboarding orchestration layer / system of action  
**Primary platform:** Web application  

---

# 1. Purpose and authority

This FSD is the functional source of truth for OnboardFlow AI.

It is written for both humans and implementation agents such as Codex. Codex must not invent product behavior that conflicts with this document. If code, prompts, UI, database structures, or infrastructure conflict with this document, the order of authority is:

1. explicit user instruction;
2. this `FSD.md`;
3. `TECHNICAL_APPROACH.md`;
4. existing repository code;
5. implementation-agent preference.

This document defines:

- the product thesis and USP;
- the problem and target users;
- what makes the system AI-first rather than a normal workflow app;
- how AI and deterministic automation divide responsibilities;
- the HRIS integration contract;
- stakeholder permissions;
- end-to-end onboarding workflows;
- functional requirements;
- acceptance criteria;
- demo scenarios;
- non-goals;
- the exact prototype definition of done.

---

# 2. Product thesis

## 2.1 Product statement

> **OnboardFlow AI is an HRIS-agnostic intelligent onboarding orchestration layer that converts employee context, company policy, and live operational state into an explainable, executable onboarding journey across HR, Security, IT, Managers, and Workplace services.**

The product does **not** try to replace Workday, SAP SuccessFactors, Darwinbox, BambooHR, or another HRIS.

The HRIS remains the **system of record** for employee master data.

OnboardFlow becomes the **system of action** that determines what onboarding work is required, routes it to the correct stakeholders, tracks execution, explains blockers, and gives HR and the employee real-time visibility.

## 2.2 Short pitch

> Traditional workflow systems execute a predefined onboarding checklist. OnboardFlow AI compiles and continuously explains the right onboarding journey for each employee from their role, location, employment type, company policy, and current onboarding state.

## 2.3 Positioning guardrail

The prototype must **not** claim that workflow automation, onboarding journeys, HR self-service, or AI agents are globally novel. Major HR/workflow vendors already offer workflow, onboarding, knowledge, and AI capabilities.

The prototype's defensible differentiation is the combination of:

1. **HRIS-agnostic orchestration** rather than replacing the HR system of record;
2. **AI-generated task graphs** from employee context and policy instead of only fixed templates;
3. **cross-functional last-mile onboarding** spanning HR, IT, physical Security, Manager, and Cafeteria/Workplace operations;
4. **explainability** for why every AI-generated task exists;
5. **adaptive/live-state reasoning** so the assistant understands what is actually complete, pending, or blocked;
6. **cost-aware AI escalation** that uses deterministic logic and retrieval before generative inference.

---

# 3. Why this is a timely problem

The product should be presented as participating in an industry shift from static workflow automation toward agentic and context-aware enterprise software.

Current enterprise vendors are actively adding AI agents and AI-assisted business-process capabilities across HR and employee service workflows. This validates the timing of the category; it does not imply a lack of competition.

At the same time, enterprise HR systems increasingly expose integration mechanisms such as REST, SOAP, OData, webhooks, and vendor APIs. This makes an external orchestration layer technically realistic without requiring OnboardFlow to become the master employee database.

The technical implementation must therefore be designed around:

- interoperable HRIS adapters;
- event-driven employee creation/update boundaries;
- a canonical internal employee model;
- policy-grounded AI;
- human approval for consequential access and HR actions.

---

# 4. Problem definition

## 4.1 Current-state problem

In many organizations, employee onboarding crosses multiple departments:

- HR;
- reporting Manager;
- Security / physical access;
- IT / Hardware;
- Cafeteria / Mess / Workplace services;
- the employee themselves.

A common manual pattern is sequential:

1. HR creates or receives the employee record.
2. Employee receives a paper form/checklist or multiple email instructions.
3. Employee visits Security for identity/badge/access formalities.
4. Security signs or confirms completion.
5. Employee visits IT/Hardware.
6. Employee reports to the Manager.
7. Employee completes Cafeteria/Workplace formalities.
8. Employee returns to HR or HR manually follows up.
9. HR reconciles the records.

The exact order differs across organizations, but the failure mode is the same: work that could happen in parallel is coordinated through people, email, paper, and repeated follow-up.

## 4.2 Operational pain

This creates:

- manual handoffs;
- duplicate data entry;
- employees becoming coordinators of their own onboarding;
- departments not knowing a new hire is arriving until late;
- no single source of operational onboarding status;
- no clear bottleneck owner;
- delays in physical access, hardware, software, manager induction, or workplace services;
- manual record keeping;
- inconsistent onboarding across roles and locations;
- fixed checklists that do not adapt well to context;
- repetitive HR questions and status requests.

## 4.3 Root cause

The core problem is not simply that onboarding is on paper.

The deeper problem is that organizations frequently have a **system of record** but lack a lightweight **cross-functional system of action** that can translate employee context and policy into coordinated execution.

---

# 5. Proposed solution

OnboardFlow AI converts onboarding into a parallel, role-aware, AI-assisted workflow.

```text
HRIS / HR Employee Record
          |
          v
Canonical Employee Context
          |
          +---------------- Company Policies / SOPs
          |                         |
          v                         v
        OnboardFlow AI Onboarding Compiler
                    |
                    v
          Proposed Onboarding Task Graph
                    |
          Deterministic Policy Validation
                    |
          AI Workflow Audit / Missing-Step Check
                    |
                    v
                HR Review
                    |
             Approve & Activate
                    |
      +-------------+-------------+-------------+
      |             |             |             |
      v             v             v             v
  Security          IT          Manager      Cafeteria
      |             |             |             |
      +-------------+-------------+-------------+
                    |
                    v
              Live Workflow State
               /              \
              v                v
     Employee Journey      HR Command Center
              \                /
               \              /
                v            v
              AI Copilot / Blocker Intelligence
```

The crucial behavior is parallelization. Once HR approves the plan, independent tasks can proceed simultaneously unless a real dependency exists.

---

# 6. Product principles

## P-01 - HRIS remains system of record

OnboardFlow does not become the authoritative master for compensation, legal employment status, payroll, or other HRIS-owned records.

## P-02 - OnboardFlow is the system of action

OnboardFlow owns the execution state of the onboarding journey: generated tasks, assignments, task status, blockers, approvals, audit events, and the employee-facing progress view.

## P-03 - AI reasons; deterministic software authorizes and executes

AI may:

- propose tasks;
- explain why a task is required;
- inspect a proposed plan for omissions;
- answer policy questions from grounded context;
- explain current blockers;
- summarize operational bottlenecks.

AI must not:

- grant building access;
- approve privileged software access;
- issue equipment in the real world;
- mark a human-owned task complete;
- make compensation, performance, promotion, disciplinary, hiring, or termination decisions;
- override explicit policy or authorization rules.

## P-04 - Human-in-the-loop for consequential changes

An AI-generated onboarding plan does not become active until HR approves it.

A Security request remains a request until an authorized Security user completes it.

## P-05 - Explainability is mandatory

Every AI-generated task must include a short reason, for example:

> `Engineering floor access requested because this employee is a full-time Backend Engineer assigned to the Mumbai engineering office, and the synthetic Security SOP requires that access for this role.`

The reason is informational. It does not itself authorize the task.

## P-06 - Do not use AI when deterministic logic is sufficient

Simple state questions, progress calculations, permissions, routing, timestamps, ownership checks, and exact database facts should be answered by code first.

## P-07 - Fail honestly

The product must never display a fake email-send success, fake HRIS integration, fake AI result, or fabricated policy answer.

---

# 7. Scope and priorities

## 7.1 P0 - Must work for the challenge demo

The final prototype must demonstrate all of the following.

### Identity and authorization

1. Role-based login for:
   - HR;
   - Employee;
   - Manager;
   - Security;
   - IT;
   - Cafeteria/Mess.

2. Server-side authorization. UI hiding alone is not sufficient.

### HRIS boundary

3. A **Demo HRIS Connector** that accepts a synthetic `employee.created` event and maps it into the canonical OnboardFlow employee model.

4. HR may also manually create a synthetic onboarding record as a fallback demo path.

5. The UI must label the connector as a **demo/synthetic HRIS integration**, not as a live Workday/SAP/Darwinbox integration.

### AI onboarding compiler

6. AI dynamically generates a proposed onboarding task graph using:
   - role/job title;
   - department;
   - location;
   - employment type;
   - start date;
   - manager;
   - synthetic company policies/SOPs.

7. AI output includes:
   - stakeholder;
   - task title;
   - task description;
   - instructions;
   - priority;
   - reason;
   - relevant policy reference when available;
   - dependency IDs when a dependency is truly required.

8. AI output is schema validated before use.

9. HR must review and approve the plan before task activation.

### Workflow execution

10. Approval creates persisted stakeholder tasks.

11. Security, IT, Manager, and Cafeteria see only authorized tasks.

12. Stakeholders can:
   - start;
   - block;
   - complete;
   - add a note.

13. Independent tasks are active in parallel by default.

14. Task state changes update persisted onboarding progress.

15. Every meaningful state change creates an audit event.

### Employee experience

16. Employee sees:
   - total progress;
   - completed work;
   - current work;
   - blocked work;
   - next actionable step;
   - responsible stakeholder;
   - location/instructions where available.

17. Employee Copilot can answer at least:
   - `What should I do next?`
   - `Is my laptop ready?`
   - `Why is my access still pending?`

18. Answers to operational state questions must reflect persisted live state and change when the underlying state changes.

### HR visibility

19. HR sees:
   - all active onboardings;
   - progress per employee;
   - pending/blocked tasks;
   - stakeholder responsible for each blocker;
   - audit timeline.

20. The end-to-end demo must remain functional without email.

## 7.2 P1 - Strongly preferred after P0

1. **AI Workflow Auditor** that reviews the generated plan before HR approval and flags likely omissions or inconsistencies using policy context.
2. Hybrid policy retrieval for Copilot using keyword + vector retrieval fused by RRF.
3. AI blocker-impact explanation.
4. Azure Communication Services email notifications.
5. AI HR bottleneck summary.
6. Token/call telemetry visible on an internal diagnostics panel or logs.

## 7.3 P2 - Optional / roadmap

1. Real Workday connector.
2. Real SAP SuccessFactors connector.
3. Real Darwinbox connector.
4. Real BambooHR connector.
5. Microsoft Entra ID enterprise SSO.
6. Microsoft Teams integration.
7. ITSM/asset-management integration.
8. Real physical access-control integration.
9. Service Bus/event-driven distributed processing.
10. Azure AI Search managed hybrid retrieval.
11. Predictive time-to-ready modeling from historical data.
12. Process mining and continuous onboarding optimization.
13. Model Router / multi-model cost routing.

---

# 8. Explicit non-goals for the 4-hour build

Codex must not spend core build time implementing:

- payroll;
- compensation;
- candidate ranking;
- recruitment ATS features;
- performance scoring;
- promotion/termination recommendations;
- attendance;
- leave management;
- biometric access;
- real door-controller integration;
- real employee PII/document upload;
- real payroll data;
- multi-tenant billing;
- drag-and-drop workflow designer;
- a full enterprise HRIS connector requiring a tenant the team does not possess;
- Kubernetes;
- microservices;
- heavy event infrastructure unless required to make P0 work.

---

# 9. Assumptions and challenge constraints

1. All demo identities and company data are synthetic.
2. The company has an existing HRIS or HR employee master process.
3. OnboardFlow receives a minimal onboarding-safe employee profile, not full HR records.
4. HR owns approval of the generated onboarding plan.
5. Stakeholders own completion of their real-world tasks.
6. Company policies/SOPs used by the AI are synthetic Markdown/JSON documents created for the demo.
7. The app is low-volume during the hackathon.
8. The active Azure subscription has a user-provided budget ceiling of INR 9,555 credits, but this document does not assume every Azure service is eligible for those credits.
9. Azure resource/model region availability and policy restrictions must be discovered from the subscription; they must not be guessed.
10. A GPT-5 mini deployment may already exist from prior Azure setup; implementation must discover and reuse working resources when appropriate rather than blindly creating duplicates.
11. Email is non-critical to the core workflow and must never block task completion.
12. The demo HRIS connector is a truthful simulation of the integration boundary, not a claim of live vendor tenancy.

---

# 10. Personas and roles

## 10.1 HR

### Goals

- initiate/import a new employee onboarding;
- generate the correct onboarding journey;
- review AI reasoning;
- approve the plan;
- monitor all stakeholders;
- identify blockers;
- retain an auditable record.

### Permissions

HR can:

- view all synthetic onboarding cases;
- create/import employees;
- generate and regenerate AI plans;
- view the plan audit;
- approve/activate plans;
- view all tasks and events;
- view all blockers;
- use HR-level AI summary features.

HR cannot impersonate a stakeholder to falsely complete real stakeholder-owned work in the normal demo path.

## 10.2 Employee

### Goals

- understand onboarding progress;
- know exactly what to do next;
- know who owns a pending step;
- ask onboarding/policy questions.

### Permissions

Employee can:

- view only their own onboarding;
- view their visible task status/instructions;
- use Copilot for their own onboarding context.

Employee cannot:

- approve plans;
- complete Security/IT/Manager/Cafeteria tasks;
- inspect another employee.

## 10.3 Manager

Can view only employees assigned to them and Manager-scoped onboarding tasks.

## 10.4 Security

Can view and update only Security-scoped tasks required for onboarding.

Security must not receive unnecessary HR/private data.

## 10.5 IT / Hardware

Can view and update only IT-scoped tasks required for onboarding.

## 10.6 Cafeteria / Mess / Workplace

Can view and update only Cafeteria/Workplace-scoped tasks required for onboarding.

---

# 11. Role-access matrix

| Capability | HR | Employee | Manager | Security | IT | Cafeteria |
|---|---:|---:|---:|---:|---:|---:|
| View all onboardings | Yes | No | No | No | No | No |
| View own onboarding | Yes | Yes | N/A | N/A | N/A | N/A |
| View assigned employee | Yes | Self | Yes | Task-limited | Task-limited | Task-limited |
| Import/create employee | Yes | No | No | No | No | No |
| Generate AI plan | Yes | No | No | No | No | No |
| Review AI reason | Yes | Limited visible task reason | Assigned only | Assigned only | Assigned only | Assigned only |
| Approve plan | Yes | No | No | No | No | No |
| Start own stakeholder task | No* | No | Yes | Yes | Yes | Yes |
| Block own stakeholder task | No* | No | Yes | Yes | Yes | Yes |
| Complete own stakeholder task | No* | No | Yes | Yes | Yes | Yes |
| View full audit | Yes | Limited | Limited | Limited | Limited | Limited |
| Employee Copilot | Optional | Yes | Optional | No | No | No |
| HR blocker intelligence | Yes | No | No | No | No | No |

`*` HR can own explicit HR tasks but should not complete other departments' tasks in the canonical demo.

---

# 12. Canonical onboarding lifecycle

## 12.1 Source employee data

An onboarding can start in either of two ways.

### Path A - Demo HRIS event

A synthetic external system sends an `employee.created` payload to the Demo HRIS Connector.

The connector:

1. validates the payload;
2. normalizes it into the canonical employee model;
3. enforces idempotency using provider + external employee/event ID;
4. creates or updates the synthetic employee record;
5. creates a `DRAFT` onboarding case;
6. records an audit event.

### Path B - Manual HR form

HR enters the same canonical fields through the UI.

This is a fallback path and must not undermine the HRIS architecture.

## 12.2 AI Onboarding Compiler

HR clicks `Generate AI Plan`.

Input context includes only what is needed:

- canonical employee profile;
- selected policy/SOP chunks;
- allowed stakeholders;
- supported task types;
- company constraints.

The model returns a strict structured plan.

The system must reject output that:

- uses an unknown stakeholder;
- fails schema validation;
- requests prohibited actions;
- references a nonexistent dependency;
- attempts to mark work already complete;
- attempts to grant access automatically.

## 12.3 Deterministic validation

After AI generation, code validates known invariants.

Examples:

- every task has one allowed stakeholder;
- no duplicate task IDs;
- all dependencies exist;
- dependency graph is acyclic;
- required policy-mandated tasks configured in rules are present;
- no prohibited stakeholder/action combination occurs.

## 12.4 AI Workflow Auditor

If enabled, a second AI pass receives:

- employee context;
- relevant policy chunks;
- normalized proposed plan.

It returns only:

- missing requirement suggestions;
- inconsistency warnings;
- redundancy warnings;
- policy references;
- confidence/grounding notes.

It does **not** mutate the plan automatically.

HR decides whether to apply suggestions.

## 12.5 HR review and activation

HR sees:

- generated tasks grouped by stakeholder;
- reasons;
- policy references;
- dependencies;
- audit warnings.

HR can:

- remove a task;
- edit non-sensitive task text;
- accept an auditor suggestion;
- regenerate;
- approve and activate.

Upon approval, tasks are persisted and activated.

## 12.6 Parallel stakeholder execution

All tasks without unmet dependencies become actionable immediately.

Independent Security, IT, Manager, and Cafeteria work can proceed in parallel.

## 12.7 Employee journey

The employee dashboard derives state from the task graph.

It must distinguish:

- completed;
- currently actionable;
- waiting on another stakeholder;
- blocked;
- upcoming.

The app calculates a deterministic next step.

## 12.8 HR monitoring

HR sees the complete graph and can answer:

- Who is blocking this onboarding?
- Which stakeholder has the oldest pending task?
- What percentage is complete?
- What tasks are blocked?
- What changed and when?

## 12.9 Completion

An onboarding becomes `COMPLETED` only when all required tasks are complete.

Optional tasks do not block completion unless explicitly marked `required=true`.

---

# 13. Status model

## 13.1 Onboarding statuses

- `DRAFT` - employee record exists; active tasks not yet approved.
- `PLAN_READY` - AI plan exists and awaits HR review.
- `ACTIVE` - approved task graph is being executed.
- `BLOCKED` - one or more critical required tasks are blocked; may be derived rather than manually set.
- `COMPLETED` - every required task is complete.
- `CANCELLED` - future/optional production state; not required for demo.

## 13.2 Task statuses

- `PENDING`
- `IN_PROGRESS`
- `BLOCKED`
- `COMPLETED`

## 13.3 Allowed task transitions

```text
PENDING -> IN_PROGRESS
PENDING -> BLOCKED
IN_PROGRESS -> BLOCKED
IN_PROGRESS -> COMPLETED
BLOCKED -> IN_PROGRESS
BLOCKED -> COMPLETED   (allowed only if stakeholder resolves and completes in one action)
```

Completed tasks are immutable in the demo except through an HR-only corrective flow that is not required for P0.

---

# 14. Progress and readiness calculation

AI must never calculate official progress.

For required tasks:

```text
progressPercent = completedRequiredTasks / totalRequiredTasks * 100
```

Round for display only.

`nextActionableTasks` are required tasks whose:

- status is not `COMPLETED`; and
- all dependencies are complete; and
- status is not `BLOCKED` unless the employee owns an explicit unblock action.

The employee's `next step` is derived deterministically from this set using priority then creation order.

---

# 15. AI capability specification

## 15.1 AI capability A - Onboarding Compiler (P0)

### Objective

Convert employee context + policy context into a proposed executable task graph.

### Input

Minimum:

- role/job title;
- department;
- location;
- employment type;
- start date;
- manager;
- policy/SOP context;
- allowed stakeholders;
- available task categories.

### Required output fields per task

- `clientTaskId`
- `stakeholder`
- `category`
- `title`
- `description`
- `instructions`
- `priority`
- `required`
- `reason`
- `policyRefs[]`
- `dependsOnClientTaskIds[]`

### Allowed stakeholders

- `HR`
- `MANAGER`
- `SECURITY`
- `IT`
- `CAFETERIA`

### Safety

The AI must use verbs such as `request`, `prepare`, `verify`, `provision`, `schedule`, or `review`.

It must not output claims that access or equipment is already authorized/completed.

### Acceptance

A Backend Engineer and Sales Executive must receive meaningfully different generated plans when policy/context differs.

The difference must be generated dynamically, not hardcoded complete plans.

## 15.2 Deterministic Policy Validation Engine (P0)

This is not an LLM feature.

Purpose:

- enforce invariants;
- check mandatory rule coverage;
- check task graph validity;
- prevent AI from bypassing policy constraints.

Example synthetic rule:

```json
{
  "id": "VPN_REQUIRES_SECURITY_TRAINING",
  "ifTaskCategory": "VPN_ACCESS",
  "requiresTaskCategory": "SECURITY_TRAINING"
}
```

The rule engine can identify missing requirements without consuming generative tokens.

## 15.3 AI capability B - Workflow Auditor (P1, high-value)

### Objective

Review the compiler output for likely omissions, redundancy, contradictions, or policy mismatches.

### Key behavior

The auditor returns suggestions; it cannot activate or edit tasks directly.

Example:

> `VPN access is requested but Security Awareness Training is not present. Policy SEC-ONB-04 requires training before VPN activation.`

### Acceptance

At least one seeded test case should intentionally omit a policy-linked task and show the auditor detecting it.

## 15.4 AI capability C - State-aware Employee Copilot (P0)

### Objective

Answer onboarding questions using the minimum required combination of:

1. live workflow state;
2. employee profile;
3. deterministic facts;
4. relevant policy context.

### Context precedence

1. **Live persisted state** for operational questions.
2. **Explicit deterministic rules**.
3. **Retrieved company policy**.
4. **Generative explanation**.

The model must never contradict live state.

### Example

Before IT completion:

> `Is my laptop ready?`

The response must indicate that the IT task is still pending/in progress.

After IT completes the task, asking the same question must produce a materially different answer reflecting completion.

### Unsupported question

If the policy/state does not contain enough information:

> `I cannot verify that from the available onboarding data or policy. Please contact HR.`

## 15.5 AI capability D - Blocker Impact Intelligence (P1)

### Objective

Explain how a blocked task affects downstream work.

Deterministic graph traversal identifies downstream dependent tasks.

AI may convert those facts into a human-friendly explanation and, only when supported by policy, suggest an allowed alternative.

Example:

> `Laptop provisioning is blocked. Repository setup and development-environment setup depend on it, but Security badge and Manager induction can continue.`

The dependency calculation is not performed by the LLM.

## 15.6 AI capability E - HR Bottleneck Summary (P1/P2)

Statistics/SQL/code computes:

- pending count by stakeholder;
- average/median completion time where data exists;
- age of oldest pending task;
- blocked counts.

AI summarizes the computed metrics.

AI must not invent performance conclusions unsupported by the data.

## 15.7 Future AI capability - Continuous Process Optimization

With enough historical data, future versions may use statistical/ML techniques to predict likely delays and recommend earlier task creation.

The hackathon prototype must not claim a trained neural model or predictive accuracy because it has no legitimate training dataset.

---

# 16. AI efficiency and token-governance requirements

## 16.1 Core rule

> **Never spend generative tokens on a problem that database lookup, rules, retrieval, or graph algorithms can answer reliably.**

## 16.2 AI escalation funnel

```text
Request
  |
  v
[0] Authorization + direct state lookup
  |
  | unresolved
  v
[1] Deterministic rules / task graph / metadata filters
  |
  | unresolved
  v
[2] Keyword retrieval (BM25 or equivalent)
  |
  v
[3] Vector retrieval when available
  |
  v
[4] Rank fusion / top-k policy context
  |
  | interpretation still required
  v
[5] Generative model
```

## 16.3 Examples

- `Who is my manager?` -> database only.
- `Is my laptop ready?` -> task-state lookup only; optional templated natural-language rendering.
- `What should I do next?` -> task graph algorithm; optional AI explanation.
- `What does the remote work policy say for my role?` -> hybrid retrieval + small grounded model response.
- `Generate my onboarding plan` -> generative model required.

## 16.4 Token/cost telemetry

Every generative request should record, where the provider response exposes it:

- operation type;
- model/deployment;
- input tokens;
- cached input tokens if reported;
- output tokens;
- latency;
- success/failure;
- employee/onboarding correlation ID without sensitive prompt logging.

The prototype should prefer logging token counts over inventing an INR cost if live pricing is not configured.

---

# 17. HRIS integration functional contract

## 17.1 Concept

OnboardFlow must integrate through an adapter boundary.

```text
HRIS (system of record)
       |
       | employee created/changed
       v
HRIS Connector / Adapter
       |
       | canonical mapping
       v
CanonicalEmployee
       |
       v
OnboardFlow (system of action)
       |
       | onboarding completion/status
       v
Optional HRIS write-back
```

## 17.2 Canonical employee model

Required fields:

- `externalSystem`
- `externalEmployeeId`
- `firstName`
- `lastName`
- `workEmail` (synthetic in demo)
- `jobTitle`
- `department`
- `location`
- `employmentType`
- `startDate`
- `managerExternalId`
- `managerName`

Optional:

- `costCenter`
- `jobLevel`
- `businessUnit`
- `workMode`

Do not ingest unnecessary sensitive HRIS fields.

## 17.3 Demo connector

P0 must implement a truthful demo integration endpoint that accepts a synthetic HRIS event.

Example:

```json
{
  "source": "DEMO_HRIS",
  "eventId": "evt-1001",
  "eventType": "employee.created",
  "employee": {
    "externalEmployeeId": "EMP-1024",
    "firstName": "Aarav",
    "lastName": "Sharma",
    "workEmail": "aarav.sharma@example.test",
    "jobTitle": "Backend Engineer",
    "department": "Engineering",
    "location": "Mumbai",
    "employmentType": "FULL_TIME",
    "startDate": "2026-09-28",
    "managerExternalId": "MGR-210",
    "managerName": "Priya Nair"
  }
}
```

The system must display the imported employee and allow HR to generate the plan.

## 17.4 Production connector strategy

The core application must depend on a generic connector contract, not vendor-specific schemas.

Planned adapters may include:

- Workday (REST, SOAP/WWS, RaaS, or WQL depending on tenant/use case);
- SAP SuccessFactors Employee Central (OData APIs subject to permissions);
- BambooHR (API + employee webhooks);
- Darwinbox (documented APIs with privileged access and supported authentication mechanisms).

The prototype must not state that any of these production adapters are connected unless credentials and a real tenant are actually used.

## 17.5 Idempotency

Repeated delivery of the same external event must not create duplicate onboardings.

Unique identity should include at minimum:

`externalSystem + eventId`

and employee-level uniqueness should include:

`externalSystem + externalEmployeeId`

---

# 18. Functional requirements

## FR-001 Authentication

Every demo actor must authenticate before accessing protected routes.

### Acceptance

Unauthenticated access to protected APIs is rejected.

## FR-002 Authorization

Authorization is enforced server-side.

### Acceptance examples

- Employee A cannot fetch Employee B's onboarding by changing a URL/ID.
- Security cannot query IT-only task detail.
- IT cannot complete a Security task.
- Manager A cannot view an employee assigned to Manager B.

## FR-003 Demo HRIS import

The system accepts a synthetic external employee event and creates/updates exactly one canonical employee/onboarding record.

## FR-004 Manual HR create

HR can manually create an onboarding using the same canonical fields.

## FR-005 AI plan generation

HR can request a dynamic plan from Azure AI.

### Acceptance

- valid schema;
- allowed stakeholders only;
- reasons included;
- role/context differences visible;
- no activation before approval.

## FR-006 Policy validation

The generated graph passes deterministic graph/rule validation before approval.

## FR-007 Workflow audit

When enabled, AI audit suggestions appear separately and require HR action to apply.

## FR-008 HR plan approval

Only HR can approve.

Approval persists executable tasks.

## FR-009 Stakeholder queues

Each stakeholder sees only actionable/authorized tasks.

## FR-010 Task execution

Start/block/complete transitions persist and create audit events.

## FR-011 Progress

Progress is deterministic and updates after task changes.

## FR-012 Employee journey

Employee sees current and next steps derived from the real task graph.

## FR-013 State-aware Copilot

Copilot answers must reflect live state and policy context with truthful uncertainty.

## FR-014 HR command center

HR can see all active onboarding progress and blockers.

## FR-015 Audit trail

Important actions are recorded chronologically with actor, action, time, entity, and metadata.

## FR-016 Email (P1)

Notification failure must never roll back a successful workflow state change.

## FR-017 AI telemetry

AI calls expose token/use metadata to server logs/diagnostics when provider metadata is available.

## FR-018 Demo reset

Provide an idempotent seed/reset path so the demonstration can be restored to a known state quickly.

---

# 19. UI specification

## 19.1 Login

Provide six clearly labeled synthetic demo identities.

Do not show real credentials in production-oriented documentation; demo credentials may appear in a local development helper card.

## 19.2 HR Command Center

Must show:

- active onboarding count;
- average completion percentage (simple code calculation);
- blocked onboarding count;
- table/cards with employee, role, start date, progress, current blocker, status;
- `Import Demo HRIS Event` or equivalent demo button;
- `Create Onboarding`;
- onboarding detail navigation.

## 19.3 HR - Create / Import

Show the canonical employee fields.

If imported from Demo HRIS, display source badge:

`Imported from Demo HRIS`

## 19.4 HR - AI Plan Review

Group tasks by stakeholder.

Each card shows:

- task;
- description;
- AI reason;
- policy reference;
- priority;
- dependency;
- required/optional.

Actions:

- regenerate;
- run audit (if P1);
- apply/remove auditor suggestion;
- approve and activate.

## 19.5 HR - Onboarding Detail

Show:

- employee profile;
- overall progress;
- stakeholder lanes;
- blockers;
- dependency visualization or simple grouped task view;
- audit timeline.

## 19.6 Employee - My Journey

Primary visual hierarchy:

1. progress;
2. current/next step;
3. blocked items;
4. completed/upcoming items;
5. Copilot.

The employee should never need to interpret an internal HR operations dashboard.

## 19.7 Stakeholder workspace

Focused task queue.

Each task displays only the minimal fields needed to perform the work.

Actions:

- `Start`
- `Report Blocker`
- `Mark Complete`

## 19.8 Copilot

Suggested prompts may be displayed, but answers must still be dynamically resolved.

Suggested demo prompts:

- `What should I do next?`
- `Is my laptop ready?`
- `Why is my engineering-floor access pending?`
- `Where do I report after Security?`

---

# 20. Notification requirements

## 20.1 In-app

P0 may rely on dashboard state rather than a full notification inbox.

## 20.2 Email (P1)

Useful events:

- onboarding activated;
- critical task blocked;
- stakeholder task completed;
- onboarding fully complete.

Email content is generated from deterministic event state. The LLM is not required to compose routine notification emails.

---

# 21. Audit and record-keeping

Record at least:

- employee imported/created;
- AI plan requested;
- AI plan generated;
- AI audit run;
- HR plan approved;
- task created;
- task started;
- task blocked;
- task completed;
- onboarding completed;
- email send attempted/result where implemented.

Audit events must not contain provider secrets or full model prompts.

---

# 22. Security and privacy requirements

1. Synthetic data only.
2. Secrets remain server-side.
3. Role and ownership checks happen server-side on every protected mutation/read.
4. Do not trust role values submitted by the browser.
5. Avoid exposing more employee fields than each stakeholder needs.
6. AI prompt context follows data-minimization principles.
7. The LLM cannot authorize physical/security access.
8. Unsupported policy answers must be escalated rather than fabricated.
9. HRIS webhook endpoints must support provider authentication/signature validation in real connectors; the demo connector may use a challenge-only shared secret or server-only route protection.
10. Do not log passwords, API keys, Azure secrets, SMTP secrets, access tokens, or sensitive prompt content.

---

# 23. Non-functional requirements

## NFR-001 Demo reliability

The core workflow must work locally even if deployment fails.

## NFR-002 Responsiveness

UI should provide loading, success, and failure states for all external operations.

## NFR-003 Graceful AI failure

AI generation failures keep the onboarding in `DRAFT`; they do not corrupt workflow state.

## NFR-004 Email independence

Email failure cannot fail task completion.

## NFR-005 Cost awareness

The application should minimize generative calls and limit prompt context.

## NFR-006 Observability

Server logs should include correlation IDs for onboarding and AI operations.

## NFR-007 Accessibility

Use semantic controls, labels, keyboard-focus behavior, and status text in addition to color.

---

# 24. Canonical synthetic demo data

## 24.1 Employee A

- Name: Aarav Sharma
- External ID: EMP-1024
- Role: Backend Engineer
- Department: Engineering
- Location: Mumbai
- Employment: Full-time
- Manager: Priya Nair
- Start date: 2026-09-28

Expected AI characteristics:

- development laptop;
- corporate identity/account;
- VPN/repository/development access requests where policy permits;
- Security badge and engineering-zone request;
- engineering buddy/induction;
- cafeteria/workplace provisioning.

## 24.2 Employee B

- Name: Meera Shah
- External ID: EMP-1025
- Role: Sales Executive
- Department: Sales
- Location: Mumbai
- Employment: Full-time
- Manager: Arjun Mehta
- Start date: 2026-09-28

Expected AI characteristics:

- sales laptop/device setup;
- CRM/access request where policy permits;
- sales induction;
- Security badge/general office access;
- cafeteria/workplace provisioning;
- no engineering repository/development-lab tasks unless policy explicitly requires them.

These are expectations, not hardcoded complete task arrays.

---

# 25. Acceptance test scenarios

## AT-01 HRIS import is idempotent

Send the same synthetic `employee.created` event twice.

Expected: one employee/onboarding, no duplicate.

## AT-02 AI plans differ by role

Generate for Aarav and Meera.

Expected: valid plans with material role-specific differences.

## AT-03 Human approval boundary

Generate a plan but do not approve.

Expected: stakeholders do not see active tasks.

Approve.

Expected: stakeholder queues populate.

## AT-04 Authorization

Security attempts to fetch/complete an IT task by direct API request.

Expected: authorization failure.

## AT-05 Live progress

Complete an IT task.

Expected:

- task persists as complete;
- event appears;
- employee progress changes;
- HR sees the same change.

## AT-06 State-aware Copilot

Ask `Is my laptop ready?` before and after IT completes the task.

Expected: answer changes according to persisted state.

## AT-07 Blocker impact

Block a laptop task that has dependent tasks.

Expected: deterministic dependency service identifies impacted tasks; if AI explanation enabled, it accurately describes those impacts.

## AT-08 Unsupported policy

Ask about a benefit not in the synthetic policy corpus.

Expected: system says it cannot verify and directs the employee to HR.

## AT-09 Audit plan

Use a test policy requiring Security Training before VPN access and a generated plan missing training.

Expected: deterministic validator or Workflow Auditor flags the issue; no silent activation of an invalid graph.

## AT-10 Email honesty

If email is not configured, trigger a notification event.

Expected: workflow succeeds and notification is marked/skipped/failed truthfully; UI/log must not say email was sent.

---

# 26. Seven-minute demonstration path

## 0:00-0:45 - Problem and USP

Explain that HRIS systems store the employee, while the last mile of onboarding is still cross-functional. OnboardFlow is the system of action between the HRIS and operational departments.

## 0:45-1:30 - HRIS boundary

Trigger/import the synthetic HRIS employee event.

Show Aarav appearing without manual duplicate entry.

## 1:30-2:30 - AI Onboarding Compiler

Generate Aarav's role-specific task graph.

Show reasons and policy references.

Optionally run Workflow Auditor.

Approve.

## 2:30-3:30 - Parallel stakeholders

Login as Security and IT.

Show the same employee appearing in each role's restricted queue.

Complete one task and block another.

## 3:30-4:30 - Employee

Show live progress.

Ask:

`What should I do next?`

Then ask:

`Is my laptop ready?`

Complete IT work and show the answer change.

## 4:30-5:30 - HR command center

Show the current blocker and audit timeline.

Use blocker intelligence if implemented.

## 5:30-6:20 - AI efficiency

Explain that simple facts use DB/rules/graph logic, policy questions use retrieval, and generation is reserved for reasoning.

## 6:20-7:00 - Integration / future

Explain the HRIS adapter pattern and roadmap for real Workday/SuccessFactors/Darwinbox/BambooHR connectors.

---

# 27. Prototype Definition of Done

P0 is done only when all of the following are true:

- [ ] real Azure AI call generates a valid plan;
- [ ] generated plan is not active before HR approval;
- [ ] Demo HRIS event creates/imports a canonical employee;
- [ ] repeated event does not duplicate the employee;
- [ ] stakeholder tasks persist;
- [ ] stakeholder authorization is enforced server-side;
- [ ] stakeholder state changes update employee and HR views;
- [ ] audit events persist;
- [ ] Copilot answers a live-state question correctly;
- [ ] same Copilot question changes after relevant state changes;
- [ ] unsupported policy answer is not fabricated;
- [ ] all demo data is synthetic;
- [ ] no fake external integration success is shown.

P1 should be attempted only after the above passes.

---

# 28. Judge-defense statements

## Why not just use Workday/ServiceNow?

> `We are not claiming those platforms lack workflow or AI. Our prototype targets the integration layer between an existing HRIS and the operational teams that make a new employee ready to work. The HRIS remains the system of record; OnboardFlow dynamically compiles, executes, and explains the last-mile onboarding journey.`

## Where is the AI?

> `AI compiles a context-specific onboarding graph, audits it for omissions, grounds employee guidance in policy and live state, and explains blocker impact. Deterministic software still owns authorization, state, dependencies, and progress.`

## How do you control AI cost?

> `We use an escalation funnel: database lookup, rules and graph algorithms first; keyword/vector retrieval second; generative inference only when interpretation or composition is actually required.`

## How does it talk to HRIS?

> `Through provider adapters that map vendor-specific APIs or events into a canonical employee model. For the challenge we implement the integration contract using a truthful synthetic HRIS event because we do not possess a customer Workday/SAP/Darwinbox tenant.`

---

# 29. Verified external capability basis (for implementation reference)

The following statements are based on current official vendor documentation as of 2026-09-26. Codex should re-check them if implementation depends on them.

- Microsoft Foundry / Azure OpenAI Structured Outputs can enforce a supplied JSON Schema for supported models:  
  https://learn.microsoft.com/azure/foundry/openai/how-to/structured-outputs

- Azure AI Search hybrid search combines keyword and vector retrieval and merges ranked results using Reciprocal Rank Fusion (RRF):  
  https://learn.microsoft.com/azure/search/hybrid-search-overview

- Azure OpenAI prompt caching can reduce latency/cost for repeated prompt prefixes on supported models:  
  https://learn.microsoft.com/azure/foundry/openai/how-to/prompt-caching

- Azure Cosmos DB serverless charges based on consumed request units and storage rather than provisioned throughput:  
  https://learn.microsoft.com/azure/cosmos-db/serverless

- Azure Communication Services supports email via SDK and SMTP:  
  https://learn.microsoft.com/azure/communication-services/concepts/email/email-overview  
  https://learn.microsoft.com/azure/communication-services/quickstarts/email/send-email-smtp/send-email-smtp

- Workday documents REST, Workday Web Services/SOAP, RaaS, and WQL as integration/data-access mechanisms:  
  https://doc.workday.com/workday-education/en-us/course-manuals/creating-and-securing-integrations/workday-integrations-overview.html

- SAP SuccessFactors Employee Central exposes OData APIs subject to configured permissions:  
  https://help.sap.com/docs/SAP_SUCCESSFACTORS_EMPLOYEE_CENTRAL/273e3d27f7ad4a45a14e41419030a590/setting-permissions-for-api

- BambooHR documents `employee.created` and `employee.updated` webhooks:  
  https://documentation.bamboohr.com/reference/employee-created-webhook  
  https://documentation.bamboohr.com/reference/employee-updated-webhook

- Darwinbox publishes privileged APIs and documents Basic Auth and OAuth 2.0 authentication options:  
  https://api-docs.darwinbox.com/

---

# 30. Change summary from v1.0

Version 2.0 intentionally expands the AI and integration thesis while preserving the original multi-stakeholder workflow.

Major additions:

- HRIS-agnostic `system of record` / `system of action` positioning;
- Demo HRIS Connector and canonical employee model;
- AI Onboarding Compiler terminology;
- deterministic policy validation;
- AI Workflow Auditor;
- blocker-impact intelligence;
- AI escalation funnel;
- hybrid retrieval architecture;
- AI token telemetry;
- explicit competitive-positioning guardrails;
- stronger explainability requirements;
- stronger no-fake-integration requirements.
