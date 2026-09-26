'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { OmnipresentLogo } from '@/components/OmnipresentLogo';

// Interfaces
interface User {
  id: string;
  email: string;
  name: string;
  role: 'HR' | 'EMPLOYEE' | 'MANAGER' | 'SECURITY' | 'IT' | 'CAFETERIA';
  department?: string;
  jobTitle?: string;
  employeeProfileId?: string;
  demoPassword?: string;
}

interface Employee {
  id: string;
  externalSystem: string;
  externalEmployeeId: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  jobTitle: string;
  department: string;
  location: string;
  startDate: string;
  managerName?: string;
  workMode?: string;
  profileUserId?: string;
}

interface Task {
  id: string;
  clientTaskId?: string;
  onboardingId: string;
  employeeId: string;
  stakeholder: 'HR' | 'MANAGER' | 'SECURITY' | 'IT' | 'CAFETERIA';
  category: string;
  title: string;
  description: string;
  instructions: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  required: boolean;
  reason: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED';
  blockerReason?: string;
  dependsOnTaskIds?: string[];
  startedAt?: string;
  completedAt?: string;
}

interface OnboardingCase {
  id: string;
  employeeId: string;
  externalSystem: string;
  status: 'DRAFT' | 'PLAN_READY' | 'ACTIVE' | 'COMPLETED';
  progressPercent: number;
  planVersion: number;
  draftPlan?: {
    summary: string;
    tasks: Array<{
      clientTaskId: string;
      stakeholder: 'HR' | 'MANAGER' | 'SECURITY' | 'IT' | 'CAFETERIA';
      category: string;
      title: string;
      description: string;
      instructions: string;
      priority: 'LOW' | 'MEDIUM' | 'HIGH';
      required: boolean;
      reason: string;
      dependsOnClientTaskIds: string[];
    }>;
  };
  employee: Employee | null;
  taskCount: number;
  completedTaskCount: number;
  blockedTaskCount: number;
  blockedTasks?: Array<{
    id: string;
    title: string;
    stakeholder: string;
    blockerReason?: string;
  }>;
}

interface AuditEvent {
  id: string;
  onboardingId: string;
  actorRole: string;
  eventType: string;
  details: Record<string, unknown>;
  timestamp: string;
}

interface ChatMessage {
  sender: 'user' | 'copilot';
  text: string;
  source?: 'STATE' | 'GRAPH' | 'PROFILE' | 'POLICY_AI' | 'HYBRID_RAG';
  tokensUsed?: number;
  citations?: Array<{ documentTitle: string; section?: string; similarity?: number; mode?: string }>;
  ragDiagnostics?: {
    retrievalMode: string;
    vectorSimilarity: number;
    chunksRetrieved: number;
  };
}

interface Toast {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

interface InboxItem {
  id: string;
  title: string;
  description: string;
  type: 'PENDING' | 'UPDATE' | 'ALERT';
  timestamp: string;
  actionLabel?: string;
  actionType?: 'REVIEW_PLAN' | 'INSPECT_TASK' | 'VIEW_AUDIT';
  actionPayload?: string;
  read: boolean;
}

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [demoAccounts, setDemoAccounts] = useState<User[]>([]);
  const [onboardings, setOnboardings] = useState<OnboardingCase[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Authentication & Inbox Modals State
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showInboxModal, setShowInboxModal] = useState<boolean>(false);
  const [loginIdentifier, setLoginIdentifier] = useState<string>('hr@omnipresent.ai');
  const [loginPassword, setLoginPassword] = useState<string>('Omnipresent2026!');
  const [loginError, setLoginError] = useState<string>('');
  const [isSubmittingLogin, setIsSubmittingLogin] = useState<boolean>(false);
  const [inboxFilter, setInboxFilter] = useState<'ALL' | 'PENDING' | 'UPDATE'>('ALL');
  const [readInboxIds, setReadInboxIds] = useState<Set<string>>(new Set());

  // HR Tab selection
  const [hrTab, setHrTab] = useState<'PIPELINE' | 'ALL_QUEUES' | 'AUDIT'>('PIPELINE');
  const [hrQueueStakeholderFilter, setHrQueueStakeholderFilter] = useState<string>('ALL');

  // Employee tasks checklist filter
  const [employeeTaskFilter, setEmployeeTaskFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

  // Modals & Action Drawers
  const [selectedPlanOnboarding, setSelectedPlanOnboarding] = useState<OnboardingCase | null>(null);
  const [blockerModalTask, setBlockerModalTask] = useState<Task | null>(null);
  const [blockerInput, setBlockerInput] = useState<string>('');
  const [auditLogEvents, setAuditLogEvents] = useState<AuditEvent[] | null>(null);

  // Notification Toast System
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Copilot Chat (Persona-specific chat history)
  const [chatHistories, setChatHistories] = useState<Record<string, ChatMessage[]>>({
    'user-hr': [
      {
        sender: 'copilot',
        text: 'Greetings, Helen. Omnipresent Copilot is initialized with zero-waste state resolution and Hybrid RAG policy indexing. How can I assist with your orchestration pipeline?',
      },
    ],
    'user-aarav-sharma': [
      {
        sender: 'copilot',
        text: 'Hello Aarav! Welcome to Omnipresent. I am your autonomous onboarding copilot. Ask me about your assigned tasks, office logistics, hardware status, or company policies.',
      },
    ],
    'user-it': [
      {
        sender: 'copilot',
        text: 'Welcome to IT Operations. Copilot is connected to Entra SSO, GitHub repository access, and hardware provisioning queues.',
      },
    ],
    'user-security': [
      {
        sender: 'copilot',
        text: 'Security Command ready. You can query RFID badge allocation status, FIDO2 enrollment, or High-Security Lab physical access policies.',
      },
    ],
    'user-priya-nair': [
      {
        sender: 'copilot',
        text: 'Hello Priya! Engineering Management Copilot active. Query your new hires, Day 1 1:1 agendas, or ramp-up milestones.',
      },
    ],
    'user-cafeteria': [
      {
        sender: 'copilot',
        text: 'Workplace Services ready. Check ergonomic desk assignments and cafeteria meal passes.',
      },
    ],
  });

  const [chatInput, setChatInput] = useState('');
  const [isCopilotTyping, setIsCopilotTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((type: Toast['type'], title: string, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  // Fetch initial session, accounts, onboardings, and tasks
  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const sessionRes = await fetch('/api/auth/session');
      const sessionData = await sessionRes.json();
      setCurrentUser(sessionData.user);
      setDemoAccounts(sessionData.demoAccounts || []);

      const onbRes = await fetch('/api/onboarding');
      const onbData = await onbRes.json();
      setOnboardings(onbData.onboardings || []);

      const tasksRes = await fetch('/api/tasks');
      const tasksData = await tasksRes.json();
      setTasks(tasksData.tasks || []);
    } catch {
      showToast('error', 'Connection Error', 'Failed to synchronize with Omnipresent engine.');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Current user's chat messages
  const currentChatMessages = useMemo(() => {
    if (!currentUser) return [];
    return chatHistories[currentUser.id] || [
      {
        sender: 'copilot',
        text: `Welcome to Omnipresent, ${currentUser.name}! How can I assist you with your onboarding workflow?`,
      },
    ];
  }, [currentUser, chatHistories]);

  // Handle Login via Username/Email and Password
  const handleAuthenticate = async (identifier?: string, pass?: string) => {
    const idToUse = identifier || loginIdentifier;
    const passToUse = pass || loginPassword;
    setLoginError('');
    setIsSubmittingLogin(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernameOrEmail: idToUse,
          password: passToUse,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please verify credentials.');
      }

      setCurrentUser(data.user);
      setShowLoginModal(false);
      showToast('success', 'Authenticated', `Welcome back, ${data.user.name} (${data.user.role}).`);
      await fetchInitialData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials.';
      setLoginError(msg);
      showToast('error', 'Login Failed', msg);
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  // Switch Persona shortcut from quick demo cards
  const switchPersona = async (account: User) => {
    await handleAuthenticate(account.email, 'Omnipresent2026!');
  };

  // Compile Dynamic Inbox Items based on current role and state
  const inboxItems = useMemo<InboxItem[]>(() => {
    const items: InboxItem[] = [];

    // 1. Pending Plans (HR Action)
    const draftCases = onboardings.filter((o) => o.status === 'PLAN_READY');
    draftCases.forEach((c) => {
      items.push({
        id: `inbox-plan-${c.id}`,
        title: `AI Onboarding Plan Ready: ${c.employee?.firstName} ${c.employee?.lastName}`,
        description: `Plan version ${c.planVersion} compiled with ${c.draftPlan?.tasks.length || 0} policy-grounded tasks awaiting HR sign-off.`,
        type: 'PENDING',
        timestamp: 'Just now',
        actionLabel: 'Review Plan',
        actionType: 'REVIEW_PLAN',
        actionPayload: c.id,
        read: readInboxIds.has(`inbox-plan-${c.id}`),
      });
    });

    // 2. Blocked Tasks (Action Alert)
    const blockedTasks = tasks.filter((t) => t.status === 'BLOCKED');
    blockedTasks.forEach((t) => {
      items.push({
        id: `inbox-block-${t.id}`,
        title: `⚠️ Task Blocked in ${t.stakeholder} Queue`,
        description: `"${t.title}" is blocked: ${t.blockerReason || 'Awaiting external dependency'}.`,
        type: 'ALERT',
        timestamp: 'Active Alert',
        actionLabel: 'Inspect',
        actionType: 'INSPECT_TASK',
        actionPayload: t.id,
        read: readInboxIds.has(`inbox-block-${t.id}`),
      });
    });

    // 3. Status Updates
    const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS');
    if (inProgressTasks.length > 0) {
      items.push({
        id: `inbox-progress-summary`,
        title: `${inProgressTasks.length} Parallel Tasks In Progress`,
        description: `Active stakeholder execution across Security, IT, Facilities, and Manager tracks.`,
        type: 'UPDATE',
        timestamp: 'Real-time',
        read: readInboxIds.has(`inbox-progress-summary`),
      });
    }

    // 4. Inbound HRIS webhook notification
    if (onboardings.length > 0) {
      items.push({
        id: `inbox-hris-sync`,
        title: `HRIS Inbound Feed Synchronized`,
        description: `Normalized ${onboardings.length} enterprise candidates via Workday/Darwinbox synthetic gateway with SHA-256 idempotency.`,
        type: 'UPDATE',
        timestamp: 'Synced',
        read: readInboxIds.has(`inbox-hris-sync`),
      });
    }

    return items;
  }, [onboardings, tasks, readInboxIds]);

  const unreadCount = useMemo(() => {
    return inboxItems.filter((i) => !i.read).length;
  }, [inboxItems]);

  const markAllInboxAsRead = () => {
    const allIds = new Set(inboxItems.map((i) => i.id));
    setReadInboxIds(allIds);
    showToast('info', 'Inbox Updated', 'All notifications marked as read.');
  };

  const handleInboxAction = (item: InboxItem) => {
    setReadInboxIds((prev) => new Set([...prev, item.id]));
    setShowInboxModal(false);

    if (item.actionType === 'REVIEW_PLAN' && item.actionPayload) {
      const target = onboardings.find((o) => o.id === item.actionPayload);
      if (target) setSelectedPlanOnboarding(target);
    }
  };

  // Scroll Copilot to bottom on message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChatMessages]);

  // Ingest synthetic HRIS event
  const ingestSyntheticEvent = async (presetEventId: string) => {
    try {
      const presetsRes = await fetch('/api/integrations/hris/demo/events');
      const presetsData = await presetsRes.json();
      const preset = presetsData.presets?.find((p: { eventId: string }) => p.eventId === presetEventId);

      if (!preset) {
        showToast('error', 'Preset Not Found', `Could not find preset ${presetEventId}`);
        return;
      }

      const res = await fetch('/api/integrations/hris/demo/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preset),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to ingest event');

      if (data.status === 'DUPLICATE_IGNORED') {
        showToast('info', 'Idempotent Event', 'Event was already ingested. Deduplication enforced.');
      } else {
        showToast(
          'success',
          'HRIS Ingestion Complete',
          `Created canonical employee ${data.employee.firstName} ${data.employee.lastName} in DRAFT state.`
        );
      }
      await fetchInitialData();
    } catch (err: unknown) {
      showToast('error', 'Ingestion Error', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Trigger AI Plan Compilation
  const handleGeneratePlan = async (onboardingId: string) => {
    try {
      showToast('info', 'Omnipresent AI Compiler', 'Querying Hybrid RAG policy corpus and building task graph...');
      const res = await fetch(`/api/onboarding/${onboardingId}/generate-plan`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Plan compilation failed');

      showToast(
        'success',
        'AI Plan Ready',
        `Compiled ${data.draftPlan.tasks.length} parallel tasks across Security, IT, Facilities, and Manager.`
      );
      await fetchInitialData();
    } catch (err: unknown) {
      showToast('error', 'Plan Error', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Approve AI Plan
  const handleApprovePlan = async (onboardingId: string) => {
    try {
      const res = await fetch(`/api/onboarding/${onboardingId}/approve`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve plan');

      showToast(
        'success',
        'Plan Approved & Queues Dispatched',
        `Activated onboarding journey! Dispatched ${data.taskCount} tasks to departmental queues.`
      );
      setSelectedPlanOnboarding(null);
      await fetchInitialData();
    } catch (err: unknown) {
      showToast('error', 'Approval Error', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Update Task Status
  const handleUpdateTask = async (
    taskId: string,
    status: 'PENDING' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED',
    blockerReason?: string
  ) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, blockerReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update task');

      showToast('success', 'Task Updated', `Task status transitioned to ${status}.`);
      setBlockerModalTask(null);
      await fetchInitialData();
    } catch (err: unknown) {
      showToast('error', 'Task Update Error', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // View Audit Logs
  const handleViewAudit = async (onboardingId: string) => {
    try {
      const res = await fetch(`/api/onboarding/${onboardingId}/audit`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch audit trail');
      setAuditLogEvents(data.auditEvents || []);
    } catch (err: unknown) {
      showToast('error', 'Audit Error', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Reset Demo Seed
  const handleResetDemo = async () => {
    try {
      showToast('info', 'Resetting Demo State', 'Restoring original seed state...');
      const res = await fetch('/api/onboarding/reset', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');
      showToast('success', 'Demo Reset', 'Environment restored to baseline state.');
      await fetchInitialData();
    } catch (err: unknown) {
      showToast('error', 'Reset Error', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Send Message to Copilot
  const handleSendCopilot = async (overridePrompt?: string) => {
    const textToSend = overridePrompt || chatInput;
    if (!textToSend.trim() || isCopilotTyping) return;

    const currentUserId = currentUser?.id || 'anonymous';
    const userMessage: ChatMessage = { sender: 'user', text: textToSend };

    setChatHistories((prev) => ({
      ...prev,
      [currentUserId]: [...(prev[currentUserId] || []), userMessage],
    }));

    if (!overridePrompt) setChatInput('');
    setIsCopilotTyping(true);

    try {
      const res = await fetch('/api/copilot/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to query Copilot');

      const copilotMessage: ChatMessage = {
        sender: 'copilot',
        text: data.answer,
        source: data.source,
        tokensUsed: data.tokensUsed,
        citations: data.citations,
        ragDiagnostics: data.ragDiagnostics,
      };

      setChatHistories((prev) => ({
        ...prev,
        [currentUserId]: [...(prev[currentUserId] || []), copilotMessage],
      }));
    } catch (err: unknown) {
      const errorMessage: ChatMessage = {
        sender: 'copilot',
        text: `Error resolving query: ${err instanceof Error ? err.message : 'Unknown error'}`,
      };
      setChatHistories((prev) => ({
        ...prev,
        [currentUserId]: [...(prev[currentUserId] || []), errorMessage],
      }));
    } finally {
      setIsCopilotTyping(false);
    }
  };

  // Stakeholder Queues Filtering
  const stakeholderTasks = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'HR') return tasks;
    return tasks.filter((t) => t.stakeholder === currentUser.role);
  }, [tasks, currentUser]);

  const hrGlobalTasks = useMemo(() => {
    return tasks;
  }, [tasks]);

  const currentEmployeeOnboarding = useMemo(() => {
    if (!currentUser || currentUser.role !== 'EMPLOYEE') return null;
    return onboardings.find((o) => o.employee?.profileUserId === currentUser.id || o.employeeId === currentUser.employeeProfileId) || null;
  }, [currentUser, onboardings]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080c17] flex flex-col items-center justify-center p-6 text-center">
        <OmnipresentLogo size={56} />
        <div className="mt-6 flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
          <span className="text-sm font-bold text-slate-300">Initializing Omnipresent Autonomous Architecture...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080c17] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Toast Notification Container */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl border shadow-2xl transition-all duration-300 animate-fade-in-up flex items-start gap-3 backdrop-blur-xl ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                : toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
                : toast.type === 'warning'
                ? 'bg-amber-950/90 border-amber-500/40 text-amber-200'
                : 'bg-indigo-950/90 border-indigo-500/40 text-indigo-200'
            }`}
          >
            <span className="text-lg">
              {toast.type === 'success' && '✓'}
              {toast.type === 'error' && '✕'}
              {toast.type === 'warning' && '⚠️'}
              {toast.type === 'info' && 'ℹ️'}
            </span>
            <div className="flex-1 min-w-0">
              <h4 className="font-extrabold text-xs tracking-wide text-white">{toast.title}</h4>
              <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Top Application Header */}
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#080c17]/85 backdrop-blur-xl px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        {/* Brand System */}
        <div className="flex items-center gap-4">
          <OmnipresentLogo size={40} />
          <div className="hidden sm:block h-6 w-px bg-white/10" />
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-extrabold text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live System of Action
          </span>
        </div>

        {/* User Capsule & Controls */}
        <div className="flex items-center gap-3">
          {/* Active User Capsule */}
          <div className="flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-2xl bg-slate-900/90 border border-white/10 shadow-lg">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-cyan-500 flex items-center justify-center font-black text-xs text-white shadow-md">
              {currentUser?.name?.[0] || 'U'}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-black text-white leading-tight flex items-center gap-1.5">
                {currentUser?.name}
                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {currentUser?.role}
                </span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {currentUser?.department || currentUser?.jobTitle || 'Enterprise Access'}
              </span>
            </div>

            {/* Built-in Inbox Bell Icon */}
            <button
              onClick={() => setShowInboxModal(true)}
              className="relative ml-1 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white transition-all border border-white/5 active:scale-95"
              title="Open Built-in Persona Inbox"
            >
              <span className="text-sm">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] font-black flex items-center justify-center shadow-lg shadow-indigo-500/50 animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Switch User / Sign In Button */}
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
            >
              <span>🔑</span> Sign In / Switch
            </button>
          </div>

          {/* Reset Demo Seed */}
          <button
            onClick={handleResetDemo}
            title="Reset demo data to initial clean seed"
            className="px-3 py-1.5 text-xs text-rose-400 bg-rose-950/30 border border-rose-800/50 rounded-xl hover:bg-rose-900/40 hover:text-rose-200 transition-colors font-bold shadow-xs active:scale-95"
          >
            Reset
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6">

        {/* ========================================================================= */}
        {/* VIEW A: HR DIRECTOR ORCHESTRATION VIEW                                    */}
        {/* ========================================================================= */}
        {currentUser?.role === 'HR' && (
          <div className="flex flex-col gap-6 animate-fade-in-up">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2.5">
                  <span>👩‍💼</span> HR Command Center
                </h1>
                <p className="text-xs font-medium text-slate-300 mt-0.5">
                  Ingest external candidate events, compile AI task graphs with Hybrid RAG, approve plans, and audit cross-functional execution.
                </p>
              </div>

              {/* HR Tab Navigation */}
              <div className="flex p-1 rounded-2xl border border-white/10 bg-slate-900/80 shadow-md text-xs">
                <button
                  onClick={() => setHrTab('PIPELINE')}
                  className={`px-4 py-1.5 rounded-xl font-extrabold transition-all ${
                    hrTab === 'PIPELINE'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Onboarding Pipeline
                </button>
                <button
                  onClick={() => setHrTab('ALL_QUEUES')}
                  className={`px-4 py-1.5 rounded-xl font-extrabold transition-all ${
                    hrTab === 'ALL_QUEUES'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Global Department Queues
                </button>
                <button
                  onClick={() => setHrTab('AUDIT')}
                  className={`px-4 py-1.5 rounded-xl font-extrabold transition-all ${
                    hrTab === 'AUDIT'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Compliance & Audit Logs
                </button>
              </div>
            </div>

            {/* TAB 1: HR PIPELINE & INGESTION */}
            {hrTab === 'PIPELINE' && (
              <div className="flex flex-col gap-6">
                {/* Synthetic HRIS Inbound Simulator Bar */}
                <div className="border border-white/10 rounded-3xl p-5 shadow-2xl bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 backdrop-blur-xl">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                      </span>
                      <h2 className="text-xs font-black uppercase tracking-wider text-white">
                        HRIS Inbound Webhook Simulator (Demo Boundary)
                      </h2>
                    </div>
                    <p className="text-xs font-medium text-slate-300 max-w-xl leading-relaxed">
                      Simulates synthetic <code className="text-indigo-300 font-mono font-bold bg-indigo-950/80 px-1 py-0.5 rounded border border-indigo-700/50">employee.created</code> events from Workday / Darwinbox. Normalizes inbound payloads into canonical records in DRAFT state with SHA-256 idempotency protection.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => ingestSyntheticEvent('evt-hris-aarav-001')}
                      className="px-3.5 py-2 text-xs font-extrabold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/40 active:scale-95 transition-all shadow-md"
                    >
                      + Ingest Aarav (Backend Eng)
                    </button>
                    <button
                      onClick={() => ingestSyntheticEvent('evt-hris-meera-002')}
                      className="px-3.5 py-2 text-xs font-extrabold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/40 active:scale-95 transition-all shadow-md"
                    >
                      + Ingest Meera (Sales Exec)
                    </button>
                    <button
                      onClick={() => ingestSyntheticEvent('evt-hris-rohan-003')}
                      className="px-3.5 py-2 text-xs font-extrabold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/40 active:scale-95 transition-all shadow-md"
                    >
                      + Ingest Rohan (Security)
                    </button>
                  </div>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="border border-white/10 rounded-3xl p-5 bg-slate-900/70 backdrop-blur-xl shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                      Total Ingested Candidates
                    </span>
                    <div className="text-3xl font-black text-white mt-1.5">
                      {onboardings.length}
                    </div>
                    <span className="text-xs font-medium text-slate-400 mt-0.5 block">Omnipresent Master</span>
                  </div>

                  <div className="border border-indigo-500/20 rounded-3xl p-5 bg-slate-900/70 backdrop-blur-xl shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                    <span className="text-xs font-bold text-indigo-300 uppercase tracking-wide">
                      Awaiting AI Plan
                    </span>
                    <div className="text-3xl font-black text-indigo-400 mt-1.5">
                      {onboardings.filter((o) => o.status === 'DRAFT').length}
                    </div>
                    <span className="text-xs font-medium text-slate-400 mt-0.5 block">Ready for compiler</span>
                  </div>

                  <div className="border border-amber-500/20 rounded-3xl p-5 bg-slate-900/70 backdrop-blur-xl shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                      Active In-Flight
                    </span>
                    <div className="text-3xl font-black text-amber-400 mt-1.5">
                      {onboardings.filter((o) => o.status === 'ACTIVE').length}
                    </div>
                    <span className="text-xs font-medium text-slate-400 mt-0.5 block">Parallel tracks active</span>
                  </div>

                  <div className="border border-rose-500/20 rounded-3xl p-5 bg-slate-900/70 backdrop-blur-xl shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                    <span className="text-xs font-bold text-rose-300 uppercase tracking-wide">
                      Blocked Operational Items
                    </span>
                    <div className="text-3xl font-black text-rose-400 mt-1.5">
                      {tasks.filter((t) => t.status === 'BLOCKED').length}
                    </div>
                    <span className="text-xs font-medium text-slate-400 mt-0.5 block">Requires intervention</span>
                  </div>
                </div>

                {/* Pipeline Cases Table */}
                <div className="border border-white/10 rounded-3xl shadow-xl overflow-hidden bg-slate-900/80 backdrop-blur-xl">
                  <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-sm text-white">
                        Canonical Employee Pipeline
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 font-medium">
                        Real-time state machine tracking normalized new hire lifecycles.
                      </p>
                    </div>
                    <span className="text-xs text-indigo-300 font-bold bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-700/40">
                      {onboardings.length} Active Records
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-white/10">
                        <tr>
                          <th className="px-6 py-3.5 font-extrabold">Employee</th>
                          <th className="px-6 py-3.5 font-extrabold">Role & Department</th>
                          <th className="px-6 py-3.5 font-extrabold">Start Date</th>
                          <th className="px-6 py-3.5 font-extrabold">Status</th>
                          <th className="px-6 py-3.5 font-extrabold">Progress</th>
                          <th className="px-6 py-3.5 font-extrabold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-medium">
                        {onboardings.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                              No onboarding cases ingested yet. Use the simulator above to ingest candidate events.
                            </td>
                          </tr>
                        ) : (
                          onboardings.map((onb) => (
                            <tr
                              key={onb.id}
                              className="hover:bg-slate-800/40 transition-colors"
                            >
                              <td className="px-6 py-4">
                                <div className="font-black text-white text-sm">
                                  {onb.employee?.firstName} {onb.employee?.lastName}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  {onb.employee?.workEmail}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="font-extrabold text-slate-200">
                                  {onb.employee?.jobTitle}
                                </div>
                                <div className="text-[11px] text-indigo-400 font-bold mt-0.5">
                                  {onb.employee?.department} • {onb.employee?.location}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-slate-300 font-semibold">
                                {onb.employee?.startDate}
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                    onb.status === 'COMPLETED'
                                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                                      : onb.status === 'ACTIVE'
                                      ? 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60'
                                      : onb.status === 'PLAN_READY'
                                      ? 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                                      : 'bg-slate-800/90 text-slate-300 border-slate-700/60'
                                  }`}
                                >
                                  {onb.status}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-24 bg-slate-800 rounded-full h-2 overflow-hidden border border-white/10">
                                    <div
                                      className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                                      style={{ width: `${onb.progressPercent}%` }}
                                    />
                                  </div>
                                  <span className="font-black text-slate-200 text-xs">
                                    {onb.progressPercent}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {onb.status === 'DRAFT' && (
                                    <button
                                      onClick={() => handleGeneratePlan(onb.id)}
                                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-extrabold rounded-xl transition-all shadow-md"
                                    >
                                      ⚡ Compile Plan
                                    </button>
                                  )}

                                  {onb.status === 'PLAN_READY' && (
                                    <button
                                      onClick={() => setSelectedPlanOnboarding(onb)}
                                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black rounded-xl transition-all shadow-md"
                                    >
                                      📋 Review AI Plan
                                    </button>
                                  )}

                                  {onb.status === 'ACTIVE' && (
                                    <button
                                      onClick={() => {
                                        setHrTab('ALL_QUEUES');
                                      }}
                                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl font-bold border border-white/10 transition-colors"
                                    >
                                      Inspect Tasks
                                    </button>
                                  )}

                                  <button
                                    onClick={() => handleViewAudit(onb.id)}
                                    className="px-2.5 py-1.5 rounded-xl transition-colors text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
                                  >
                                    📋 Audit
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: HR GLOBAL DEPARTMENT QUEUES */}
            {hrTab === 'ALL_QUEUES' && (
              <div className="flex flex-col gap-6">
                <div className="border border-white/10 rounded-3xl p-5 shadow-xl bg-slate-900/80 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-black text-white">
                      Global Cross-Functional Task Oversight
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Master operational view across Security, IT, Manager, and Cafeteria queues.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {['ALL', 'SECURITY', 'IT', 'MANAGER', 'CAFETERIA'].map((s) => (
                      <button
                        key={s}
                        onClick={() => setHrQueueStakeholderFilter(s)}
                        className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all ${
                          hrQueueStakeholderFilter === s
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {hrGlobalTasks
                    .filter((t) => hrQueueStakeholderFilter === 'ALL' || t.stakeholder === hrQueueStakeholderFilter)
                    .map((task) => (
                      <div
                        key={task.id}
                        className={`border rounded-3xl p-5 flex flex-col justify-between gap-4 shadow-xl backdrop-blur-xl transition-all ${
                          task.status === 'BLOCKED'
                            ? 'border-rose-500/40 bg-rose-950/20'
                            : task.status === 'COMPLETED'
                            ? 'border-emerald-500/40 bg-emerald-950/20'
                            : task.status === 'IN_PROGRESS'
                            ? 'border-indigo-500/50 bg-indigo-950/20'
                            : 'bg-slate-900/70 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10">
                              {task.stakeholder} • {task.category}
                            </span>
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                task.status === 'COMPLETED'
                                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700/60'
                                  : task.status === 'IN_PROGRESS'
                                  ? 'bg-indigo-950/90 text-indigo-300 border-indigo-700/60'
                                  : task.status === 'BLOCKED'
                                  ? 'bg-rose-950/90 text-rose-300 border-rose-700/60'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              {task.status}
                            </span>
                          </div>

                          <h4 className="font-black text-sm text-white leading-snug">
                            {task.title}
                          </h4>
                          <p className="text-xs text-slate-300 font-medium mt-1.5 line-clamp-3">
                            {task.instructions || task.description}
                          </p>

                          {task.reason && (
                            <div className="mt-3 p-2.5 rounded-2xl border border-indigo-500/20 bg-indigo-950/30 text-[11px] text-slate-300 font-medium">
                              <span className="font-extrabold text-indigo-300">Policy Grounding: </span>
                              {task.reason}
                            </div>
                          )}

                          {task.status === 'BLOCKED' && task.blockerReason && (
                            <div className="mt-2.5 p-2.5 rounded-2xl border border-rose-500/40 bg-rose-950/40 text-[11px] text-rose-200 font-bold">
                              <span>⚠️ Blocked: </span>
                              {task.blockerReason}
                            </div>
                          )}
                        </div>

                        <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                          {task.status !== 'COMPLETED' ? (
                            <>
                              {task.status !== 'IN_PROGRESS' ? (
                                <button
                                  onClick={() => handleUpdateTask(task.id, 'IN_PROGRESS')}
                                  className="flex-1 py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs transition-all shadow-md active:scale-95"
                                >
                                  Start Task
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUpdateTask(task.id, 'COMPLETED')}
                                  className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition-all shadow-md active:scale-95"
                                >
                                  ✓ Mark Complete
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setBlockerModalTask(task);
                                  setBlockerInput('');
                                }}
                                className="py-1.5 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 font-extrabold text-xs transition-all active:scale-95"
                              >
                                Block
                              </button>
                            </>
                          ) : (
                            <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                              ✓ Completed on {new Date(task.completedAt || Date.now()).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* TAB 3: AUDIT TRAIL LOG */}
            {hrTab === 'AUDIT' && (
              <div className="border border-white/10 rounded-3xl p-6 shadow-xl bg-slate-900/80 backdrop-blur-xl flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-base text-white">
                      Immutable Audit & Compliance Ledger
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      All state changes, HRIS ingestions, AI plan versions, and stakeholder actions are cryptographically sequenced.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
                  {onboardings.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      No audit records available.
                    </div>
                  ) : (
                    onboardings.map((onb) => (
                      <div
                        key={onb.id}
                        className="p-4 rounded-2xl border border-white/10 bg-slate-950/60 flex items-center justify-between gap-4"
                      >
                        <div>
                          <div className="font-black text-xs text-white">
                            Candidate: {onb.employee?.firstName} {onb.employee?.lastName} ({onb.employee?.jobTitle})
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Status: <span className="font-bold text-indigo-400">{onb.status}</span> | Progress: {onb.progressPercent}% | Plan Version: v{onb.planVersion}
                          </div>
                        </div>
                        <button
                          onClick={() => handleViewAudit(onb.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-extrabold text-slate-200 border border-white/10 transition-colors"
                        >
                          View Full Timeline →
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW B: FUNCTIONAL STAKEHOLDER QUEUES (IT, Security, Facilities, Manager) */}
        {/* ========================================================================= */}
        {currentUser?.role !== 'HR' && currentUser?.role !== 'EMPLOYEE' && (
          <div className="flex flex-col gap-6 animate-fade-in-up">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h1 className="text-xl font-black text-white flex items-center gap-2">
                  <span>
                    {currentUser?.role === 'IT' && '🛠️'}
                    {currentUser?.role === 'SECURITY' && '🛡️'}
                    {currentUser?.role === 'CAFETERIA' && '🥗'}
                    {currentUser?.role === 'MANAGER' && '👔'}
                  </span>{' '}
                  {currentUser?.role} Department Queue
                </h1>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Tasks compiled by Omnipresent AI and assigned directly to your operational track.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-indigo-400 bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-700/40">
                  {stakeholderTasks.filter((t) => t.status !== 'COMPLETED').length} Pending Tasks
                </span>
              </div>
            </div>

            {/* Stakeholder Task Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stakeholderTasks.length === 0 ? (
                <div className="col-span-full p-12 text-center text-xs text-slate-500 border border-white/10 rounded-3xl bg-slate-900/60">
                  No active tasks in your queue. All assigned deliverables are completed or awaiting plan compilation.
                </div>
              ) : (
                stakeholderTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`border rounded-3xl p-5 flex flex-col justify-between gap-4 shadow-xl backdrop-blur-xl transition-all ${
                      task.status === 'BLOCKED'
                        ? 'border-rose-500/40 bg-rose-950/20'
                        : task.status === 'COMPLETED'
                        ? 'border-emerald-500/40 bg-emerald-950/20'
                        : task.status === 'IN_PROGRESS'
                        ? 'border-indigo-500/50 bg-indigo-950/20'
                        : 'bg-slate-900/70 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10">
                          {task.category}
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                            task.status === 'COMPLETED'
                              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700/60'
                              : task.status === 'IN_PROGRESS'
                              ? 'bg-indigo-950/90 text-indigo-300 border-indigo-700/60'
                              : task.status === 'BLOCKED'
                              ? 'bg-rose-950/90 text-rose-300 border-rose-700/60'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {task.status}
                        </span>
                      </div>

                      <h4 className="font-black text-sm text-white leading-snug">
                        {task.title}
                      </h4>
                      <p className="text-xs text-slate-300 font-medium mt-1.5 line-clamp-3">
                        {task.instructions || task.description}
                      </p>

                      {task.reason && (
                        <div className="mt-3 p-2.5 rounded-2xl border border-indigo-500/20 bg-indigo-950/30 text-[11px] text-slate-300 font-medium">
                          <span className="font-extrabold text-indigo-300">Policy Grounding: </span>
                          {task.reason}
                        </div>
                      )}

                      {task.status === 'BLOCKED' && task.blockerReason && (
                        <div className="mt-2.5 p-2.5 rounded-2xl border border-rose-500/40 bg-rose-950/40 text-[11px] text-rose-200 font-bold">
                          <span>⚠️ Blocked: </span>
                          {task.blockerReason}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                      {task.status !== 'COMPLETED' ? (
                        <>
                          {task.status !== 'IN_PROGRESS' ? (
                            <button
                              onClick={() => handleUpdateTask(task.id, 'IN_PROGRESS')}
                              className="flex-1 py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs transition-all shadow-md active:scale-95"
                            >
                              Start Task
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateTask(task.id, 'COMPLETED')}
                              className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition-all shadow-md active:scale-95"
                            >
                              ✓ Mark Complete
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setBlockerModalTask(task);
                              setBlockerInput('');
                            }}
                            className="py-1.5 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 font-extrabold text-xs transition-all active:scale-95"
                          >
                            Block
                          </button>
                        </>
                      ) : (
                        <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                          ✓ Completed on {new Date(task.completedAt || Date.now()).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW C: EMPLOYEE CANDIDATE PORTAL & COPILOT CHAT                          */}
        {/* ========================================================================= */}
        {currentUser?.role === 'EMPLOYEE' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in-up">
            {/* Left 7 cols: Employee Progress Journey */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {/* Profile Welcome Banner */}
              <div className="border border-white/10 rounded-3xl p-6 shadow-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-xl font-black text-white shadow-xl">
                    {currentEmployeeOnboarding?.employee?.firstName?.[0] || 'C'}
                  </div>
                  <div>
                    <h1 className="text-xl font-black text-white">
                      Welcome, {currentEmployeeOnboarding?.employee?.firstName}{' '}
                      {currentEmployeeOnboarding?.employee?.lastName}!
                    </h1>
                    <p className="text-xs text-indigo-300 font-extrabold mt-0.5">
                      {currentEmployeeOnboarding?.employee?.jobTitle} •{' '}
                      {currentEmployeeOnboarding?.employee?.department}
                    </p>
                    <p className="text-xs text-slate-400 font-medium mt-1">
                      Office: <span className="font-bold text-white">{currentEmployeeOnboarding?.employee?.location}</span> | Manager:{' '}
                      <span className="font-bold text-white">{currentEmployeeOnboarding?.employee?.managerName || 'Unassigned'}</span>
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-6 pt-5 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-extrabold text-slate-300">
                      Live Journey Completion
                    </span>
                    <span className="font-black text-indigo-400 text-sm">
                      {currentEmployeeOnboarding?.progressPercent || 0}%
                    </span>
                  </div>
                  <div className="w-full rounded-full h-3.5 overflow-hidden border border-white/10 bg-slate-800">
                    <div
                      className="bg-gradient-to-r from-indigo-500 via-indigo-600 to-emerald-400 h-full transition-all duration-700 rounded-full"
                      style={{ width: `${currentEmployeeOnboarding?.progressPercent || 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Parallel Tracks Grid */}
              <div className="border border-white/10 rounded-3xl p-6 shadow-xl bg-slate-900/80 backdrop-blur-xl">
                <h3 className="font-black text-sm text-white mb-4">
                  Parallel Cross-Functional Tracks
                </h3>
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="p-4 rounded-2xl border border-white/10 bg-slate-950/60 shadow-md">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-200">
                      <span>🛡️</span> Security Clearance
                    </div>
                    <p className="text-xs text-slate-400 font-medium mt-1.5 leading-relaxed">
                      RFID Badging, FIDO2 MFA key enrollment, and office physical access.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-white/10 bg-slate-950/60 shadow-md">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-200">
                      <span>🛠️</span> IT Equipment & Cloud
                    </div>
                    <p className="text-xs text-slate-400 font-medium mt-1.5 leading-relaxed">
                      Workstation staging, Entra SSO identity, and developer repos.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-white/10 bg-slate-950/60 shadow-md">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-200">
                      <span>🥗</span> Workplace & Meal Pass
                    </div>
                    <p className="text-xs text-slate-400 font-medium mt-1.5 leading-relaxed">
                      Ergonomic desk assignment and monthly digital cafeteria stipend.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-white/10 bg-slate-950/60 shadow-md">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-200">
                      <span>👔</span> Manager Ramp-up
                    </div>
                    <p className="text-xs text-slate-400 font-medium mt-1.5 leading-relaxed">
                      Day 1 technical 1:1, onboarding buddy introduction, and milestones.
                    </p>
                  </div>
                </div>
              </div>

              {/* Employee Assigned Action Items Checklist */}
              <div className="border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col gap-4 bg-slate-900/80 backdrop-blur-xl">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-black text-sm text-white flex items-center gap-2">
                      <span>📋</span> Your Onboarding Milestones & Action Items
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      Real-time status of your departmental onboarding deliverables.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-800 border border-white/10 p-1 rounded-xl text-[11px] font-bold">
                    {(['ALL', 'PENDING', 'COMPLETED'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setEmployeeTaskFilter(filter)}
                        className={`px-3 py-1 rounded-lg transition-all active:scale-95 ${
                          employeeTaskFilter === filter
                            ? 'bg-indigo-600 text-white shadow-md font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {tasks
                    .filter((t) => {
                      if (employeeTaskFilter === 'COMPLETED') return t.status === 'COMPLETED';
                      if (employeeTaskFilter === 'PENDING') return t.status !== 'COMPLETED';
                      return true;
                    })
                    .map((task) => (
                      <div
                        key={task.id}
                        className={`p-3.5 rounded-2xl border transition-all duration-200 flex items-start gap-3 ${
                          task.status === 'COMPLETED'
                            ? 'bg-emerald-950/20 border-emerald-900/40 text-slate-300'
                            : 'bg-slate-950/70 border-white/10 text-slate-200'
                        }`}
                      >
                        <div className="mt-0.5">
                          {task.status === 'COMPLETED' ? (
                            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black shadow-md">
                              ✓
                            </span>
                          ) : task.status === 'IN_PROGRESS' ? (
                            <span className="relative flex h-4 w-4 mt-0.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500" />
                            </span>
                          ) : (
                            <span className="w-4 h-4 rounded-full border-2 border-slate-600 block mt-0.5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <span className={`text-xs font-black ${task.status === 'COMPLETED' ? 'line-through text-slate-500' : 'text-white'}`}>
                              {task.title}
                            </span>
                            <span
                              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                                task.status === 'COMPLETED'
                                  ? 'bg-emerald-950 text-emerald-400 border-emerald-700/60'
                                  : task.status === 'IN_PROGRESS'
                                  ? 'bg-indigo-950 text-indigo-300 border-indigo-700/60'
                                  : task.status === 'BLOCKED'
                                  ? 'bg-rose-950 text-rose-300 border-rose-700/60'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              {task.stakeholder} • {task.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-medium mt-1 line-clamp-2">
                            {task.instructions || task.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  {tasks.length === 0 && (
                    <div className="p-6 text-center text-xs text-slate-500 font-bold">
                      No tasks currently active for this candidate.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right 5 cols: State-Aware Copilot Widget */}
            <div className="lg:col-span-5 flex flex-col border border-white/10 rounded-3xl shadow-2xl overflow-hidden h-[660px] bg-slate-900/80 backdrop-blur-xl">
              {/* Copilot Header */}
              <div className="px-5 py-4 border-b border-white/10 bg-slate-950/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-sm font-bold text-white shadow-lg">
                    🤖
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-white">
                      Omnipresent Copilot
                    </h3>
                    <p className="text-[10px] text-emerald-400 font-extrabold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Hybrid RAG + State Engine
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-white/10">
                  k-NN + BM25
                </span>
              </div>

              {/* Message History */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 text-xs">
                {currentChatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col max-w-[88%] animate-fade-in-up ${
                      msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'
                    }`}
                  >
                    <div
                      className={`p-3.5 rounded-2xl ${
                        msg.sender === 'user'
                          ? 'bg-indigo-600 text-white rounded-br-none shadow-md'
                          : 'bg-slate-800/90 text-slate-200 rounded-bl-none border border-white/10 shadow-lg'
                      }`}
                    >
                      <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>

                      {/* Source & Token Diagnostics */}
                      {msg.source && (
                        <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-wrap items-center gap-1.5 text-[9px] text-slate-400">
                          <span className="font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-950 text-indigo-300 border border-indigo-500/25">
                            {msg.source === 'STATE' && '⚡ DB / Live State Fact'}
                            {msg.source === 'PROFILE' && '👤 DB Profile Fact'}
                            {msg.source === 'GRAPH' && '🕸️ Task Graph Resolver'}
                            {msg.source === 'POLICY_AI' && '🧠 Azure AI (gpt-5-mini)'}
                            {msg.source === 'HYBRID_RAG' && '⚡ Hybrid RAG (k-NN + BM25)'}
                          </span>
                          <span className="font-extrabold">• {msg.tokensUsed} tokens</span>
                          {msg.ragDiagnostics && (
                            <span className="text-cyan-400 font-bold">
                              • {msg.ragDiagnostics.vectorSimilarity}% k-NN Sim
                            </span>
                          )}
                        </div>
                      )}

                      {/* Policy Citations */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-2 text-[9px] text-slate-300">
                          <span className="font-extrabold text-white">Citations: </span>
                          {msg.citations.map((c, i) => (
                            <span key={i} className="underline mr-1.5 font-bold text-indigo-300">
                              [{c.documentTitle}: {c.section}]
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isCopilotTyping && (
                  <div className="self-start flex items-center gap-2 p-3 rounded-2xl bg-slate-800/90 border border-white/10 text-xs shadow-md animate-fade-in-up">
                    <span className="text-[11px] font-bold text-slate-300">Copilot resolving neural state</span>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Sample Prompt Chips (Fast Testing) */}
              <div className="px-4 py-2.5 border-t border-white/10 bg-slate-950/60 flex flex-wrap gap-1.5">
                <button
                  onClick={() => handleSendCopilot('What are my tasks?')}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border border-white/10 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white active:scale-95"
                >
                  📋 What are my tasks?
                </button>
                <button
                  onClick={() => handleSendCopilot('Where are we?')}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border border-white/10 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white active:scale-95"
                >
                  📍 Where are we?
                </button>
                <button
                  onClick={() => handleSendCopilot('Is my laptop ready?')}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border border-white/10 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white active:scale-95"
                >
                  💻 Is my laptop ready?
                </button>
                <button
                  onClick={() => handleSendCopilot('What is the policy for High-Security Lab access?')}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border border-white/10 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white active:scale-95"
                >
                  📜 Lab access policy?
                </button>
              </div>

              {/* Chat Input */}
              <div className="p-3 border-t border-white/10 bg-slate-950 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendCopilot()}
                  placeholder="Ask Omnipresent Copilot anything..."
                  className="flex-1 rounded-xl px-3.5 py-2 text-xs border border-white/10 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={() => handleSendCopilot()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md transition-all"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: AI PLAN REVIEW & APPROVAL DRAWER                                 */}
      {/* ========================================================================= */}
      {selectedPlanOnboarding && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="border border-white/10 rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden bg-slate-900 text-slate-100 animate-pop-in">
            <div className="px-6 py-4 border-b border-white/10 bg-slate-950 flex items-center justify-between">
              <div>
                <h3 className="font-black text-base text-white">
                  Review AI Compiled Onboarding Plan
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Candidate: <span className="font-bold text-white">{selectedPlanOnboarding.employee?.firstName} {selectedPlanOnboarding.employee?.lastName}</span> (
                  {selectedPlanOnboarding.employee?.jobTitle} • {selectedPlanOnboarding.employee?.department})
                </p>
              </div>
              <button
                onClick={() => setSelectedPlanOnboarding(null)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs">
              <div className="p-4 border border-indigo-500/30 rounded-2xl bg-indigo-950/40 text-slate-200">
                <span className="font-extrabold text-indigo-300 block mb-1">
                  AI Executive Summary:
                </span>
                {selectedPlanOnboarding.draftPlan?.summary || 'No summary compiled.'}
              </div>

              <h4 className="font-black text-white text-sm mt-2">
                Proposed Parallel Task Graph ({selectedPlanOnboarding.draftPlan?.tasks.length || 0} tasks):
              </h4>

              <div className="flex flex-col gap-2.5">
                {selectedPlanOnboarding.draftPlan?.tasks.map((task, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl border border-white/10 bg-slate-950 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-white">
                        [{task.stakeholder}] {task.title}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-800 text-slate-300 border border-white/10">
                        {task.priority} Priority
                      </span>
                    </div>
                    <p className="text-slate-300 text-xs font-medium leading-relaxed">
                      {task.description}
                    </p>
                    <div className="text-[11px] text-indigo-300 font-medium">
                      <span className="font-bold text-slate-400">Reason: </span>
                      {task.reason}
                    </div>
                    {task.dependsOnClientTaskIds && task.dependsOnClientTaskIds.length > 0 && (
                      <div className="text-[11px] text-amber-300 font-bold">
                        Prerequisites: {task.dependsOnClientTaskIds.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-white/10 bg-slate-950 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedPlanOnboarding(null)}
                className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 text-xs font-bold transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => handleApprovePlan(selectedPlanOnboarding.id)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-colors"
              >
                ✓ Approve Plan & Dispatch Queues
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REPORT BLOCKER MODAL                                             */}
      {/* ========================================================================= */}
      {blockerModalTask && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="border border-rose-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 bg-slate-900 text-white animate-pop-in">
            <h3 className="font-black text-base text-rose-400">Report Operational Blocker</h3>
            <p className="text-xs text-slate-300 font-medium">Task: <span className="font-bold text-white">{blockerModalTask.title}</span></p>
            <textarea
              rows={3}
              value={blockerInput}
              onChange={(e) => setBlockerInput(e.target.value)}
              placeholder="State the reason why this task is blocked (e.g. Awaiting hardware shipment from vendor)..."
              className="w-full border border-white/10 rounded-xl p-3 text-xs bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setBlockerModalTask(null)}
                className="px-3.5 py-1.5 rounded-xl text-slate-300 hover:text-white text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateTask(blockerModalTask.id, 'BLOCKED', blockerInput)}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md"
              >
                Submit Blocker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: AUDIT TRAIL TIMELINE MODAL                                       */}
      {/* ========================================================================= */}
      {auditLogEvents && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="border border-white/10 rounded-3xl max-w-xl w-full max-h-[75vh] flex flex-col shadow-2xl overflow-hidden bg-slate-900 text-white animate-pop-in">
            <div className="px-6 py-4 border-b border-white/10 bg-slate-950 flex items-center justify-between">
              <h3 className="font-black text-sm text-white">
                Chronological Audit Timeline
              </h3>
              <button
                onClick={() => setAuditLogEvents(null)}
                className="text-slate-400 hover:text-white font-bold text-base transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3 text-xs">
              {auditLogEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3.5 border border-white/10 rounded-2xl flex flex-col gap-1 bg-slate-950"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-indigo-400">{evt.eventType}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {new Date(evt.timestamp).toLocaleTimeString()} • Role: {evt.actorRole}
                    </span>
                  </div>
                  <pre className="text-[10px] p-2.5 rounded-xl overflow-x-auto bg-slate-900 text-slate-300 font-mono border border-white/5">
                    {JSON.stringify(evt.details, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: AUTHENTICATION & PERSONA SELECTOR MODAL                          */}
      {/* ========================================================================= */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="border border-white/15 rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-5 bg-slate-900 text-white animate-pop-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <OmnipresentLogo size={30} showText={false} />
                <div>
                  <h3 className="font-black text-base text-white">Omnipresent Sign In</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Authenticate as enterprise stakeholder or demo persona</p>
                </div>
              </div>
              <button
                onClick={() => setShowLoginModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Custom Credentials Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAuthenticate();
              }}
              className="flex flex-col gap-3"
            >
              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300 block mb-1">
                  Username or Corporate Email
                </label>
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="e.g. hr@omnipresent.ai or aarav"
                  className="w-full border border-white/10 rounded-xl px-3.5 py-2.5 text-xs bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300 block mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Default: Omnipresent2026!"
                  className="w-full border border-white/10 rounded-xl px-3.5 py-2.5 text-xs bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Demo Passwords: <code className="text-indigo-300 font-bold">Omnipresent2026!</code> or <code className="text-indigo-300 font-bold">admin123</code>
                </span>
              </div>

              {loginError && (
                <div className="p-2.5 rounded-xl border border-rose-500/40 bg-rose-950/40 text-[11px] text-rose-300 font-bold">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingLogin}
                className="w-full mt-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-xs transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {isSubmittingLogin ? 'Authenticating...' : 'Sign In with Credentials'}
              </button>
            </form>

            {/* Quick Demo Personas Selector */}
            <div className="pt-2 border-t border-white/10">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2">
                Or 1-Click Switch Demo Persona:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {demoAccounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => switchPersona(account)}
                    className="p-2.5 rounded-xl border border-white/10 bg-slate-950 hover:bg-indigo-950/60 hover:border-indigo-500/40 transition-all text-left flex items-center gap-2 group active:scale-95"
                  >
                    <span className="text-base">
                      {account.role === 'HR' && '👩‍💼'}
                      {account.role === 'EMPLOYEE' && '💻'}
                      {account.role === 'IT' && '🛠️'}
                      {account.role === 'SECURITY' && '🛡️'}
                      {account.role === 'MANAGER' && '👔'}
                      {account.role === 'CAFETERIA' && '🥗'}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-white group-hover:text-indigo-300 truncate">
                        {account.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {account.role}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: BUILT-IN PERSONA OPERATIONAL INBOX                                */}
      {/* ========================================================================= */}
      {showInboxModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="border border-white/15 rounded-3xl max-w-xl w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden bg-slate-900 text-white animate-pop-in">
            {/* Inbox Header */}
            <div className="px-6 py-4 border-b border-white/10 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">🔔</span>
                <div>
                  <h3 className="font-black text-base text-white">
                    Persona Operational Inbox
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Live notifications for <span className="text-indigo-300 font-bold">{currentUser?.name}</span> ({currentUser?.role})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllInboxAsRead}
                    className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 underline"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setShowInboxModal(false)}
                  className="text-slate-400 hover:text-white text-lg font-bold p-1 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="px-6 py-2.5 border-b border-white/10 bg-slate-950/60 flex items-center gap-2 text-xs">
              <button
                onClick={() => setInboxFilter('ALL')}
                className={`px-3 py-1 rounded-lg font-extrabold transition-all ${
                  inboxFilter === 'ALL'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({inboxItems.length})
              </button>
              <button
                onClick={() => setInboxFilter('PENDING')}
                className={`px-3 py-1 rounded-lg font-extrabold transition-all ${
                  inboxFilter === 'PENDING'
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Pending Action ({inboxItems.filter((i) => i.type === 'PENDING').length})
              </button>
              <button
                onClick={() => setInboxFilter('UPDATE')}
                className={`px-3 py-1 rounded-lg font-extrabold transition-all ${
                  inboxFilter === 'UPDATE'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Updates ({inboxItems.filter((i) => i.type === 'UPDATE').length})
              </button>
            </div>

            {/* Notifications Feed */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3 text-xs">
              {inboxItems
                .filter((item) => inboxFilter === 'ALL' || item.type === inboxFilter)
                .map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col gap-1.5 ${
                      item.read
                        ? 'border-white/5 bg-slate-950/50 opacity-70'
                        : item.type === 'ALERT'
                        ? 'border-rose-500/40 bg-rose-950/20'
                        : item.type === 'PENDING'
                        ? 'border-amber-500/40 bg-amber-950/20'
                        : 'border-indigo-500/30 bg-slate-950'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {!item.read && (
                          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                        )}
                        <span className="font-black text-white text-xs">
                          {item.title}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {item.timestamp}
                      </span>
                    </div>

                    <p className="text-slate-300 text-xs font-medium leading-relaxed">
                      {item.description}
                    </p>

                    {item.actionLabel && (
                      <div className="mt-1 flex items-center justify-end">
                        <button
                          onClick={() => handleInboxAction(item)}
                          className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[11px] shadow-sm active:scale-95 transition-all"
                        >
                          {item.actionLabel} →
                        </button>
                      </div>
                    )}
                  </div>
                ))}

              {inboxItems.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-500">
                  Inbox is currently clear. No pending actions.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
