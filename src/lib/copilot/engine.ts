import 'server-only';
import { z } from 'zod';
import { SessionUser } from '@/lib/auth/types';
import { store } from '@/lib/data/store';
import { CanonicalEmployee, OnboardingDocument } from '@/lib/types/models';
import { retrieveHybridPolicyChunks, RetrievalResult } from '@/lib/policy/corpus';
import { getAzureOpenAIClient, getAzureOpenAIDeployment } from '@/lib/azure/openai';

export interface CopilotResult {
  answer: string;
  source: 'STATE' | 'GRAPH' | 'PROFILE' | 'POLICY_AI' | 'HYBRID_RAG';
  tokensUsed: number;
  citations?: Array<{ documentTitle: string; section?: string; similarity?: number; mode?: string }>;
  relatedTaskId?: string;
  ragDiagnostics?: {
    retrievalMode: string;
    vectorSimilarity: number;
    chunksRetrieved: number;
  };
}

export async function handleCopilotQuery(
  user: SessionUser,
  rawMessage: string
): Promise<CopilotResult> {
  const query = rawMessage.trim().toLowerCase();

  // Resolve target employee record with multi-layer fallbacks
  let employee: CanonicalEmployee | null = null;
  if (user.employeeProfileId) {
    employee = await store.getEmployeeById(user.employeeProfileId);
  }
  if (!employee && user.email) {
    const allEmps = await store.getAllEmployees();
    employee = allEmps.find((e) => e.workEmail.toLowerCase() === user.email.toLowerCase()) || null;
  }
  if (!employee && user.id) {
    const allEmps = await store.getAllEmployees();
    employee = allEmps.find((e) => e.profileUserId === user.id) || null;
  }
  if (!employee && user.role === 'HR') {
    const allEmps = await store.getAllEmployees();
    employee = allEmps[0] || null;
  }

  let onboarding: OnboardingDocument | null = null;
  if (employee) {
    onboarding = await store.getOnboardingByEmployeeId(employee.id);
    if (!onboarding) {
      const allOnb = await store.getAllOnboardings();
      onboarding = allOnb.find((o) => o.employeeId === employee!.id) || null;
    }
  }
  const tasks = onboarding ? await store.getTasksByOnboardingId(onboarding.id) : [];

  // =========================================================================
  // FUNNEL STEP 1: DIRECT STATE & DATABASE RESOLUTION (0 LLM Tokens, <5ms)
  // =========================================================================

  // 1. Location / Office / "Where are we?" / "Where am I?"
  if (
    query.includes('where are we') ||
    query.includes('where am i') ||
    query.includes('which office') ||
    query.includes('what office') ||
    query.includes('my location') ||
    query.includes('work location') ||
    query.includes('city') ||
    query === 'where are we?' ||
    query === 'where am i?'
  ) {
    if (employee?.location) {
      return {
        answer: `You are assigned to the ${employee.location} office (Work Mode: ${employee.workMode || 'Hybrid'}). Core collaboration hours are 10:00 AM to 4:00 PM local time.`,
        source: 'PROFILE',
        tokensUsed: 0,
      };
    }
    return {
      answer: 'Your workplace office location is currently being confirmed by HR.',
      source: 'PROFILE',
      tokensUsed: 0,
    };
  }

  // 2. Start Date / Joining Date
  if (
    query.includes('when do i start') ||
    query.includes('start date') ||
    query.includes('joining date') ||
    query.includes('first day') ||
    query.includes('day 1')
  ) {
    if (employee?.startDate) {
      return {
        answer: `Your official Day 1 start date is ${employee.startDate}. HR orientation commences at 10:00 AM local time on your first morning.`,
        source: 'PROFILE',
        tokensUsed: 0,
      };
    }
    return {
      answer: 'Your start date is being scheduled with People Operations.',
      source: 'PROFILE',
      tokensUsed: 0,
    };
  }

  // 3. Role / Department / Job Title
  if (
    query.includes('what is my role') ||
    query.includes('my job title') ||
    query.includes('what do i do') ||
    query.includes('my department') ||
    query.includes('which department') ||
    query.includes('my title')
  ) {
    if (employee?.jobTitle) {
      return {
        answer: `You are joining Omnipresent as a ${employee.jobTitle} in the ${employee.department} department (${employee.employmentType.replace('_', ' ')}).`,
        source: 'PROFILE',
        tokensUsed: 0,
      };
    }
    return {
      answer: 'Your role details are currently being finalized in the HR record.',
      source: 'PROFILE',
      tokensUsed: 0,
    };
  }

  // 4. Work Email / Corporate Identity
  if (query.includes('email') || query.includes('work email') || query.includes('corporate email')) {
    if (employee?.workEmail) {
      return {
        answer: `Your corporate work email address is ${employee.workEmail}. Single Sign-On (SSO) and Microsoft 365 identity are linked to this address.`,
        source: 'PROFILE',
        tokensUsed: 0,
      };
    }
    return {
      answer: 'Your corporate email is being provisioned by IT Operations.',
      source: 'PROFILE',
      tokensUsed: 0,
    };
  }

  // 5. "Who is my manager?" / Reporting structure
  if (query.includes('manager') && (query.includes('who') || query.includes('name') || query.includes('report to') || query.includes('my manager'))) {
    if (employee?.managerName) {
      return {
        answer: `Your reporting manager is ${employee.managerName} (${employee.department} team). They will conduct your technical ramp-up 1:1 on Day 1.`,
        source: 'PROFILE',
        tokensUsed: 0,
      };
    }
    return {
      answer: 'Your reporting manager is currently being assigned by HR.',
      source: 'PROFILE',
      tokensUsed: 0,
    };
  }

  // 6. "Is my laptop ready?" / Workstation readiness
  if (
    query.includes('laptop') ||
    query.includes('workstation') ||
    query.includes('macbook') ||
    query.includes('computer') ||
    query.includes('thinkpad') ||
    query.includes('hardware')
  ) {
    const laptopTask = tasks.find(
      (t) =>
        t.title.toLowerCase().includes('laptop') ||
        t.title.toLowerCase().includes('workstation') ||
        t.category.toLowerCase().includes('hardware') ||
        t.description.toLowerCase().includes('workstation') ||
        t.description.toLowerCase().includes('laptop')
    );

    if (!laptopTask) {
      return {
        answer: onboarding?.status === 'DRAFT' || onboarding?.status === 'PLAN_READY'
          ? 'Your onboarding plan is currently being finalized by HR. Laptop staging will be scheduled as soon as the plan is approved.'
          : 'No specific laptop provisioning task was found in your active workflow.',
        source: 'STATE',
        tokensUsed: 0,
      };
    }

    if (laptopTask.status === 'COMPLETED') {
      return {
        answer: `Yes, your laptop is configured, encrypted, and ready! IT Operations completed the staging task (${laptopTask.title}) on ${new Date(laptopTask.completedAt || Date.now()).toLocaleDateString()}. You can collect it from the IT desk on your first morning.`,
        source: 'STATE',
        tokensUsed: 0,
        relatedTaskId: laptopTask.id,
      };
    }

    if (laptopTask.status === 'IN_PROGRESS') {
      return {
        answer: `Your laptop is currently being staged and configured by IT Operations (${laptopTask.title}). It is in progress and expected to be ready before your start date.`,
        source: 'STATE',
        tokensUsed: 0,
        relatedTaskId: laptopTask.id,
      };
    }

    if (laptopTask.status === 'BLOCKED') {
      return {
        answer: `Your laptop setup is currently BLOCKED: "${laptopTask.blockerReason || 'Awaiting hardware supply.'}". The IT team (owner: IT Operations) is actively tracking this blocker.`,
        source: 'STATE',
        tokensUsed: 0,
        relatedTaskId: laptopTask.id,
      };
    }

    return {
      answer: `Your laptop provisioning request (${laptopTask.title}) is PENDING in the IT Operations queue. It will be prepared 48 hours prior to your start date (${employee?.startDate || 'Day 1'}).`,
      source: 'STATE',
      tokensUsed: 0,
      relatedTaskId: laptopTask.id,
    };
  }

  // 6.5. "What tasks are assigned to me?" / "What are my tasks?" / "Assigned tasks"
  if (
    query.includes('what tasks') ||
    query.includes('my tasks') ||
    query.includes('assigned task') ||
    query.includes('show task') ||
    query.includes('list task') ||
    query.includes('all tasks') ||
    query === 'tasks' ||
    query === 'tasks?'
  ) {
    if (!onboarding || tasks.length === 0) {
      return {
        answer: onboarding?.status === 'DRAFT' || onboarding?.status === 'PLAN_READY'
          ? `Your onboarding is currently in '${onboarding.status}' status. HR is preparing your custom task plan. Once HR reviews and approves the plan, tasks will be dispatched across IT, Security, Manager, and Cafeteria.`
          : 'No tasks have been activated in your workflow yet. Please verify that HR has approved your onboarding plan.',
        source: 'GRAPH',
        tokensUsed: 0,
      };
    }

    const completed = tasks.filter((t) => t.status === 'COMPLETED');
    const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS');
    const blocked = tasks.filter((t) => t.status === 'BLOCKED');
    const pending = tasks.filter((t) => t.status === 'PENDING');

    let summary = `You have ${tasks.length} total tasks across parallel department tracks (${completed.length} completed, ${inProgress.length} in progress, ${blocked.length} blocked, ${pending.length} pending):\n`;

    if (inProgress.length > 0) {
      summary += `\n⚡ In Progress:\n` + inProgress.map((t) => `• [${t.stakeholder}] ${t.title}`).join('\n');
    }
    if (blocked.length > 0) {
      summary += `\n⚠️ Blocked:\n` + blocked.map((t) => `• [${t.stakeholder}] ${t.title} (${t.blockerReason || 'Blocked'})`).join('\n');
    }
    if (pending.length > 0) {
      summary += `\n⏳ Upcoming / Pending:\n` + pending.slice(0, 4).map((t) => `• [${t.stakeholder}] ${t.title}`).join('\n');
      if (pending.length > 4) summary += `\n...and ${pending.length - 4} more pending tasks.`;
    }

    return {
      answer: summary,
      source: 'STATE',
      tokensUsed: 0,
    };
  }

  // 7. "What should I do next?" / Next Step
  if (query.includes('next') || query.includes('what should i do') || query.includes('status') || query.includes('upcoming')) {
    if (!onboarding) {
      return {
        answer: 'You currently have no active onboarding journey. Please contact People Operations.',
        source: 'GRAPH',
        tokensUsed: 0,
      };
    }

    if (onboarding.status === 'DRAFT' || onboarding.status === 'PLAN_READY') {
      return {
        answer: `Your onboarding is currently in '${onboarding.status}' status. HR is preparing and reviewing your custom task plan. Once approved, your first actionable items will appear here.`,
        source: 'GRAPH',
        tokensUsed: 0,
      };
    }

    // Look for pending or in-progress tasks
    const inProgressTask = tasks.find((t) => t.status === 'IN_PROGRESS');
    if (inProgressTask) {
      return {
        answer: `Your active priority step is: "${inProgressTask.title}" (${inProgressTask.stakeholder} queue). Instructions: ${inProgressTask.instructions}`,
        source: 'GRAPH',
        tokensUsed: 0,
        relatedTaskId: inProgressTask.id,
      };
    }

    const nextPending = tasks.find((t) => t.status === 'PENDING');
    if (nextPending) {
      return {
        answer: `Your next upcoming task is: "${nextPending.title}" assigned to ${nextPending.stakeholder}. Overall onboarding progress is at ${onboarding.progressPercent}%.`,
        source: 'GRAPH',
        tokensUsed: 0,
        relatedTaskId: nextPending.id,
      };
    }

    return {
      answer: `Congratulations! All required onboarding tasks are completed (${onboarding.progressPercent}%). You are fully onboarded!`,
      source: 'GRAPH',
      tokensUsed: 0,
    };
  }

  // 8. Progress / Completion percentage
  if (query.includes('progress') || query.includes('percentage') || query.includes('how much is done') || query.includes('completion')) {
    if (!onboarding) {
      return {
        answer: 'No active onboarding record is registered for your profile.',
        source: 'STATE',
        tokensUsed: 0,
      };
    }

    const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
    return {
      answer: `Your current onboarding progress is ${onboarding.progressPercent}%. (${completed} of ${tasks.length} total tasks completed across Security, IT, Manager, and Cafeteria).`,
      source: 'STATE',
      tokensUsed: 0,
    };
  }

  // 9. Blockers / Obstacles
  if (query.includes('block') || query.includes('stuck') || query.includes('delay') || query.includes('issue')) {
    const blockedTasks = tasks.filter((t) => t.status === 'BLOCKED');
    if (blockedTasks.length === 0) {
      return {
        answer: 'There are currently zero blocked tasks. Your onboarding workflow is progressing smoothly on schedule.',
        source: 'STATE',
        tokensUsed: 0,
      };
    }

    const blockerList = blockedTasks
      .map((t) => `• [${t.stakeholder}] "${t.title}": ${t.blockerReason || 'Unspecified reason'}`)
      .join('\n');

    return {
      answer: `Currently, ${blockedTasks.length} task(s) are blocked:\n${blockerList}`,
      source: 'STATE',
      tokensUsed: 0,
      relatedTaskId: blockedTasks[0]?.id,
    };
  }

  // =========================================================================
  // FUNNEL STEP 2: HYBRID RAG (k-NN + BM25) + GROUNDED AZURE AI (gpt-5-mini)
  // Only called when policy interpretation or reasoning is genuinely required
  // =========================================================================
  const hybridChunks = retrieveHybridPolicyChunks(rawMessage, 4);
  const formattedPolicies = hybridChunks
    .map((c) => `Document: ${c.documentTitle} | Section: ${c.section} [k-NN Similarity: ${c.vectorSimilarity}% | Mode: ${c.retrievalMode}]\n${c.text}`)
    .join('\n\n');

  const topSimilarity = hybridChunks[0]?.vectorSimilarity || 85;
  const primaryMode = hybridChunks[0]?.retrievalMode || 'HYBRID';

  const openai = await getAzureOpenAIClient();
  const deployment = getAzureOpenAIDeployment();
  const startTime = Date.now();

  const systemPrompt = `You are the Omnipresent AI Copilot.
You answer employee onboarding policy questions strictly based on the provided company policy excerpts retrieved via Hybrid RAG (k-NN Vector Similarity + BM25 Lexical).

Rules:
1. Distinguish between general company policy and the employee's current live state.
2. If policy requires a clearance or badge that the employee does not have yet, explicitly note that it requires stakeholder authorization.
3. Be concise, direct, helpful, and professional.
4. Output JSON only in this format:
{
  "answer": "string direct grounded answer",
  "citations": [{ "documentTitle": "string", "section": "string" }]
}`;

  const userPrompt = `Employee Context:
- Role: ${employee?.jobTitle || 'New Hire'}
- Department: ${employee?.department || 'General'}
- Location: ${employee?.location || 'HQ'}
- Current Onboarding Progress: ${onboarding?.progressPercent ?? 0}%

Policy Excerpts (Retrieved via Hybrid k-NN + BM25):
${formattedPolicies}

Employee Question: "${rawMessage}"`;

  try {
    const completion = await openai.chat.completions.create({
      model: deployment,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    const latencyMs = Date.now() - startTime;
    const content = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    // Record AI Telemetry
    if (onboarding) {
      await store.recordAIUsage({
        id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        onboardingId: onboarding.id,
        operation: 'COPILOT',
        deployment,
        inputTokens: completion.usage?.prompt_tokens,
        outputTokens: completion.usage?.completion_tokens,
        latencyMs,
        success: true,
        createdAt: new Date().toISOString(),
      });
    }

    return {
      answer: parsed.answer || 'I could not find an exact match in current company policy.',
      source: 'HYBRID_RAG',
      tokensUsed: (completion.usage?.prompt_tokens || 0) + (completion.usage?.completion_tokens || 0),
      citations: parsed.citations?.map((c: { documentTitle: string; section?: string }) => ({
        ...c,
        similarity: topSimilarity,
        mode: primaryMode,
      })) || hybridChunks.map((c) => ({
        documentTitle: c.documentTitle,
        section: c.section,
        similarity: c.vectorSimilarity,
        mode: c.retrievalMode,
      })),
      ragDiagnostics: {
        retrievalMode: primaryMode,
        vectorSimilarity: topSimilarity,
        chunksRetrieved: hybridChunks.length,
      },
    };
  } catch (err: unknown) {
    return {
      answer: `According to Omnipresent company policy (${hybridChunks[0]?.documentTitle || 'Company Handbook'}), please review the policy documentation or contact your manager for guidance.`,
      source: 'HYBRID_RAG',
      tokensUsed: 0,
      citations: hybridChunks.map((c) => ({
        documentTitle: c.documentTitle,
        section: c.section,
        similarity: c.vectorSimilarity,
        mode: c.retrievalMode,
      })),
      ragDiagnostics: {
        retrievalMode: primaryMode,
        vectorSimilarity: topSimilarity,
        chunksRetrieved: hybridChunks.length,
      },
    };
  }
}
