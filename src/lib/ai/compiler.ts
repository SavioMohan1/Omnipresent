import 'server-only';
import { z } from 'zod';
import { getAzureOpenAIClient, getAzureOpenAIDeployment } from '@/lib/azure/openai';
import { CanonicalEmployee, CompiledPlan, OnboardingDocument } from '@/lib/types/models';
import { getPolicyContextForEmployee } from '@/lib/policy/corpus';
import { validatePlan } from '@/lib/policy/validate-plan';
import { store } from '@/lib/data/store';

export const CompiledTaskSchema = z.object({
  clientTaskId: z.string().min(1),
  stakeholder: z.enum(['HR', 'MANAGER', 'SECURITY', 'IT', 'CAFETERIA']),
  category: z.string().min(1),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(800),
  instructions: z.string().min(1).max(1000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  required: z.boolean(),
  reason: z.string().min(1).max(800),
  policyRefs: z.array(
    z.object({
      documentTitle: z.string(),
      section: z.string().optional(),
    })
  ).default([]),
  dependsOnClientTaskIds: z.array(z.string()).default([]),
});

export const CompiledPlanSchema = z.object({
  summary: z.string().max(1000),
  tasks: z.array(CompiledTaskSchema).min(1).max(30),
});

export async function compileOnboardingPlan(
  employee: CanonicalEmployee,
  actorUserId?: string
): Promise<{ plan: CompiledPlan; onboarding: OnboardingDocument }> {
  const startTime = Date.now();
  const openai = await getAzureOpenAIClient();
  const deployment = getAzureOpenAIDeployment();

  const policyChunks = getPolicyContextForEmployee(employee);
  const formattedPolicyContext = policyChunks
    .map(
      (c) =>
        `### [${c.documentTitle}] ${c.section}\n${c.text}`
    )
    .join('\n\n');

  const systemPrompt = `You are the OnboardFlow AI Compiler.
Your role is to compile a context-specific onboarding task graph for a new employee based strictly on company policy.

STRICT OPERATIONAL RULES:
1. Allowed stakeholders ONLY: HR, MANAGER, SECURITY, IT, CAFETERIA.
2. Maximize PARALLEL execution across stakeholders. Only add dependencies when logically or policy required.
   - For example: IT email/identity must complete before specific cloud/developer tool access can be granted.
   - General Security badge must complete before high-security lab access.
   - Cafeteria and HR tasks can run in parallel with IT/Security.
3. Propose onboarding work requests only. DO NOT claim access is already granted.
4. Ground every task in the provided policy context and employee specifics (role, department, location).
5. For Engineering roles, include GitHub/codebase repository and development workstation tasks.
6. For Sales roles, include Salesforce CRM and sales enablement tasks.
7. Return VALID JSON ONLY matching this schema:
{
  "summary": "string overview of this tailored onboarding plan",
  "tasks": [
    {
      "clientTaskId": "task-slug-id",
      "stakeholder": "HR" | "MANAGER" | "SECURITY" | "IT" | "CAFETERIA",
      "category": "string category",
      "title": "string concise title",
      "description": "string description",
      "instructions": "step-by-step instructions for assignee",
      "priority": "LOW" | "MEDIUM" | "HIGH",
      "required": true | false,
      "reason": "why this task is required for this specific employee",
      "policyRefs": [{ "documentTitle": "string", "section": "string" }],
      "dependsOnClientTaskIds": ["clientTaskId"]
    }
  ]
}`;

  const userPrompt = `Employee Information:
- Name: ${employee.firstName} ${employee.lastName}
- Job Title: ${employee.jobTitle}
- Department: ${employee.department}
- Location: ${employee.location}
- Employment Type: ${employee.employmentType}
- Start Date: ${employee.startDate}
- Manager: ${employee.managerName || 'Unassigned'}
- Work Mode: ${employee.workMode || 'HYBRID'}

Company Policy Context:
${formattedPolicyContext}

Compile the complete, optimized onboarding task graph now.`;

  const completion = await openai.chat.completions.create({
    model: deployment,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
  });

  const latencyMs = Date.now() - startTime;
  const rawContent = completion.choices[0]?.message?.content || '{}';
  const parsedJson = JSON.parse(rawContent);

  // Validate with Zod
  const plan = CompiledPlanSchema.parse(parsedJson);

  // Validate with Deterministic Policy & DAG Engine
  const validation = validatePlan(plan, employee);
  if (!validation.valid) {
    const errorDetails = validation.errors.map((e) => `${e.ruleId}: ${e.message}`).join('; ');
    throw new Error(`Deterministic policy validation failed for AI plan: ${errorDetails}`);
  }

  // Update or create onboarding case in PLAN_READY state
  let onboarding = await store.getOnboardingByEmployeeId(employee.id);
  if (!onboarding) {
    onboarding = {
      id: `onb-${employee.id}`,
      employeeId: employee.id,
      externalSystem: employee.externalSystem,
      status: 'PLAN_READY',
      progressPercent: 0,
      planVersion: 1,
      draftPlan: plan,
      createdAt: new Date().toISOString(),
    };
  } else {
    onboarding = {
      ...onboarding,
      status: 'PLAN_READY',
      planVersion: onboarding.planVersion + 1,
      draftPlan: plan,
    };
  }
  await store.upsertOnboarding(onboarding);

  // Record Audit Event
  await store.addAuditEvent({
    id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    onboardingId: onboarding.id,
    actorUserId,
    actorRole: actorUserId ? 'HR' : 'SYSTEM',
    eventType: 'PLAN_COMPILED',
    details: {
      taskCount: plan.tasks.length,
      planVersion: onboarding.planVersion,
      model: completion.model,
      latencyMs,
    },
    timestamp: new Date().toISOString(),
  });

  // Record AI Usage Telemetry
  await store.recordAIUsage({
    id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    onboardingId: onboarding.id,
    operation: 'PLAN_COMPILE',
    deployment,
    inputTokens: completion.usage?.prompt_tokens,
    outputTokens: completion.usage?.completion_tokens,
    latencyMs,
    success: true,
    createdAt: new Date().toISOString(),
  });

  return { plan, onboarding };
}
