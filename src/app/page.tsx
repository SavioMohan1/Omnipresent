'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

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
  source?: 'STATE' | 'GRAPH' | 'PROFILE' | 'POLICY_AI';
  tokensUsed?: number;
  citations?: Array<{ documentTitle: string; section?: string }>;
}

interface Toast {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [demoAccounts, setDemoAccounts] = useState<User[]>([]);
  const [onboardings, setOnboardings] = useState<OnboardingCase[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Theme: Light Mode by default for a clean, non-contrasting enterprise aesthetic
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Tab management per persona
  const [hrTab, setHrTab] = useState<'PIPELINE' | 'ALL_QUEUES' | 'AUDIT'>('PIPELINE');
  const [queueFilter, setQueueFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED'>('ALL');
  const [hrQueueStakeholderFilter, setHrQueueStakeholderFilter] = useState<string>('ALL');

  // Modals & Drawers
  const [selectedPlanOnboarding, setSelectedPlanOnboarding] = useState<OnboardingCase | null>(null);
  const [auditLogEvents, setAuditLogEvents] = useState<AuditEvent[] | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [blockerModalTask, setBlockerModalTask] = useState<Task | null>(null);
  const [blockerInput, setBlockerInput] = useState('');

  // Premium Toast System
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Per-Persona Chat History
  const [chatsByPersona, setChatsByPersona] = useState<Record<string, ChatMessage[]>>({});
  const [chatInput, setChatInput] = useState('');
  const [isCopilotTyping, setIsCopilotTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Employee action items filter
  const [employeeTaskFilter, setEmployeeTaskFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

  const addToast = useCallback((type: Toast['type'], title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch Onboardings and Tasks
  const refreshData = useCallback(async () => {
    try {
      const [onbRes, taskRes] = await Promise.all([
        fetch('/api/onboarding'),
        fetch('/api/tasks'),
      ]);
      if (onbRes.ok) {
        const onbData = await onbRes.json();
        setOnboardings(onbData.onboardings || []);
      }
      if (taskRes.ok) {
        const taskData = await taskRes.json();
        setTasks(taskData.tasks || []);
      }
    } catch (err) {
      console.error('Error refreshing data:', err);
    }
  }, []);

  // Initialize session & accounts
  const loadSessionAndData = useCallback(async () => {
    try {
      setLoading(true);
      const sessionRes = await fetch('/api/auth/session');
      const sessionData = await sessionRes.json();
      setDemoAccounts(sessionData.demoAccounts || []);

      if (sessionData.user) {
        setCurrentUser(sessionData.user);
      } else if (sessionData.demoAccounts?.length > 0) {
        const hr = sessionData.demoAccounts.find((a: User) => a.role === 'HR') || sessionData.demoAccounts[0];
        await switchPersona(hr);
        return;
      }
      await refreshData();
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoading(false);
    }
  }, [refreshData]);

  useEffect(() => {
    loadSessionAndData();
  }, [loadSessionAndData]);

  // Persona Switcher
  const switchPersona = async (targetUser: User) => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetUser.email,
          password: targetUser.demoPassword || 'OnboardFlow2026!',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        addToast(
          'info',
          `Persona: ${data.user.name}`,
          `Role switched to ${data.user.role} (${data.user.jobTitle || data.user.department})`
        );
        await refreshData();
      }
    } catch (err) {
      addToast('error', 'Authentication Error', String(err));
    } finally {
      setLoading(false);
    }
  };

  // Synthetic HRIS Ingestion
  const ingestSyntheticEvent = async (presetEventId: string) => {
    try {
      const presetsRes = await fetch('/api/integrations/hris/demo/events');
      const presetsData = await presetsRes.json();
      const preset = presetsData.presets?.find((p: { eventId: string }) => p.eventId === presetEventId);
      if (!preset) return;

      const res = await fetch('/api/integrations/hris/demo/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-onboardflow-demo-secret': 'demo-hris-secret-synthetic-events-67890',
        },
        body: JSON.stringify(preset),
      });
      const result = await res.json();

      if (result.status === 'DUPLICATE_IGNORED') {
        addToast('warning', 'HRIS Idempotency Guard', `Event ${result.eventId} was already processed. Duplicate record prevented.`);
      } else {
        addToast('success', 'Candidate Ingested', `${preset.data.firstName} ${preset.data.lastName} (${preset.data.jobTitle}) created in DRAFT state.`);
      }
      await refreshData();
    } catch (err) {
      addToast('error', 'Ingestion Failed', String(err));
    }
  };

  // AI Plan Compiler
  const handleCompilePlan = async (onboardingId: string) => {
    try {
      setIsCompiling(true);
      addToast('info', 'AI Compiler Active', 'Azure OpenAI (gpt-5-mini) is compiling role & policy-grounded tasks...');
      const res = await fetch(`/api/onboarding/${onboardingId}/generate-plan`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to compile plan');

      addToast('success', 'AI Plan Ready', `Successfully compiled ${data.plan?.tasks?.length || 0} policy-grounded tasks in PLAN_READY status.`);
      await refreshData();

      // Open review modal
      const updatedOnb = (await (await fetch('/api/onboarding')).json()).onboardings?.find((o: OnboardingCase) => o.id === onboardingId);
      if (updatedOnb) setSelectedPlanOnboarding(updatedOnb);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Compilation failed';
      addToast('error', 'AI Compiler Error', msg);
    } finally {
      setIsCompiling(false);
    }
  };

  // HR Approve Plan
  const handleApprovePlan = async (onboardingId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/onboarding/${onboardingId}/approve`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve plan');

      addToast('success', 'Plan Approved & Queues Dispatched', `${data.tasks?.length} tasks activated into parallel stakeholder queues.`);
      setSelectedPlanOnboarding(null);
      await refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Approval failed';
      addToast('error', 'Approval Error', msg);
    } finally {
      setLoading(false);
    }
  };

  // Task Transitions
  const handleUpdateTask = async (taskId: string, newStatus: 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED', blockerReason?: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, blockerReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');

      if (newStatus === 'COMPLETED') {
        addToast('success', 'Task Completed', `"${data.task?.title}" marked as COMPLETED.`);
      } else if (newStatus === 'BLOCKED') {
        addToast('warning', 'Blocker Reported', `Blocker logged on "${data.task?.title}".`);
      } else {
        addToast('info', 'Task Started', `"${data.task?.title}" transitioned to IN_PROGRESS.`);
      }

      setBlockerModalTask(null);
      setBlockerInput('');
      await refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Task transition failed';
      addToast('error', 'Action Restricted', msg);
    }
  };

  // View Audit Log
  const handleViewAudit = async (onboardingId: string) => {
    try {
      const res = await fetch(`/api/onboarding/${onboardingId}/audit`);
      const data = await res.json();
      if (data.events) {
        setAuditLogEvents(data.events);
      }
    } catch (err) {
      addToast('error', 'Audit Log Error', String(err));
    }
  };

  // Reset Demo
  const handleResetDemo = async () => {
    try {
      setLoading(true);
      await fetch('/api/onboarding/reset', { method: 'POST' });
      setChatsByPersona({});
      await refreshData();
      addToast('info', 'Demo Reset', 'All onboarding records and tasks reset to clean initial seed.');
    } catch (err) {
      addToast('error', 'Reset Failed', String(err));
    } finally {
      setLoading(false);
    }
  };

  // Active Employee Record
  const currentEmployeeOnboarding = useMemo(() => {
    if (currentUser?.role === 'EMPLOYEE') {
      const match = onboardings.find(
        (o) =>
          o.employee?.profileUserId === currentUser.id ||
          o.employee?.workEmail?.toLowerCase() === currentUser.email?.toLowerCase() ||
          o.employeeId === currentUser.employeeProfileId
      );
      if (match) return match;
    }
    return onboardings[0];
  }, [currentUser, onboardings]);

  // Current Persona's Chat History
  const activePersonaChatKey = currentUser?.id || 'default';
  const currentChatMessages = useMemo(() => {
    if (chatsByPersona[activePersonaChatKey]) {
      return chatsByPersona[activePersonaChatKey];
    }
    const defaultGreeting = currentUser?.role === 'EMPLOYEE'
      ? `Hello ${currentUser.name.split(' ')[0]}! I am your state-aware OnboardFlow Copilot for ${currentUser.jobTitle || 'your role'} (${currentEmployeeOnboarding?.employee?.location || 'HQ'}). Ask me about your tasks, manager, laptop readiness, or policies.`
      : `Hello ${currentUser?.name || 'there'}! I am OnboardFlow Copilot. How can I assist with onboarding state or company policy?`;

    return [
      {
        sender: 'copilot' as const,
        text: defaultGreeting,
        source: 'STATE' as const,
        tokensUsed: 0,
      },
    ];
  }, [activePersonaChatKey, chatsByPersona, currentUser, currentEmployeeOnboarding]);

  // Smooth auto-scroll chat to bottom on new message or typing
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChatMessages, isCopilotTyping]);

  // Send Copilot Message
  const handleSendCopilot = async (overrideMsg?: string) => {
    const textToSend = overrideMsg || chatInput;
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = { sender: 'user', text: textToSend };
    setChatsByPersona((prev) => ({
      ...prev,
      [activePersonaChatKey]: [...(prev[activePersonaChatKey] || currentChatMessages), userMsg],
    }));

    if (!overrideMsg) setChatInput('');
    setIsCopilotTyping(true);

    try {
      const res = await fetch('/api/copilot/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        const copilotMsg: ChatMessage = {
          sender: 'copilot',
          text: data.result.answer,
          source: data.result.source,
          tokensUsed: data.result.tokensUsed,
          citations: data.result.citations,
        };
        setChatsByPersona((prev) => ({
          ...prev,
          [activePersonaChatKey]: [...(prev[activePersonaChatKey] || []), copilotMsg],
        }));
      } else {
        const errReply: ChatMessage = {
          sender: 'copilot',
          text: data.error || 'Failed to retrieve answer from state resolver.',
        };
        setChatsByPersona((prev) => ({
          ...prev,
          [activePersonaChatKey]: [...(prev[activePersonaChatKey] || []), errReply],
        }));
      }
    } catch {
      const errReply: ChatMessage = {
        sender: 'copilot',
        text: 'Error connecting to the Copilot state service.',
      };
      setChatsByPersona((prev) => ({
        ...prev,
        [activePersonaChatKey]: [...(prev[activePersonaChatKey] || []), errReply],
      }));
    } finally {
      setIsCopilotTyping(false);
    }
  };

  // Filtered Tasks for Stakeholder View
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (queueFilter === 'ALL') return true;
      return t.status === queueFilter;
    });
  }, [tasks, queueFilter]);

  // All Tasks for HR Global Queue tab
  const [hrGlobalTasks, setHrGlobalTasks] = useState<Task[]>([]);
  useEffect(() => {
    if (currentUser?.role === 'HR' && hrTab === 'ALL_QUEUES') {
      fetch('/api/tasks')
        .then((res) => res.json())
        .then((data) => setHrGlobalTasks(data.tasks || []))
        .catch(console.error);
    }
  }, [currentUser, hrTab]);

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isDarkMode
          ? 'bg-[#0B0F19] text-slate-100 selection:bg-indigo-500 selection:text-white'
          : 'bg-[#EEF2F6] text-slate-800 selection:bg-indigo-600 selection:text-white'
      }`}
    >
      {/* Toast Notification Container */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl border shadow-xl backdrop-blur-md flex items-start gap-3 transition-all transform animate-in slide-in-from-top-2 duration-300 ${
              isDarkMode
                ? toast.type === 'success'
                  ? 'bg-slate-900/95 border-emerald-500/60 text-slate-100'
                  : toast.type === 'warning'
                  ? 'bg-slate-900/95 border-amber-500/60 text-slate-100'
                  : toast.type === 'error'
                  ? 'bg-slate-900/95 border-rose-500/60 text-slate-100'
                  : 'bg-slate-900/95 border-indigo-500/60 text-slate-100'
                : toast.type === 'success'
                ? 'bg-white/95 border-emerald-300 text-slate-800 shadow-emerald-100'
                : toast.type === 'warning'
                ? 'bg-white/95 border-amber-300 text-slate-800 shadow-amber-100'
                : toast.type === 'error'
                ? 'bg-white/95 border-rose-300 text-slate-800 shadow-rose-100'
                : 'bg-white/95 border-indigo-200 text-slate-800 shadow-indigo-100'
            }`}
          >
            <div className="text-base select-none mt-0.5">
              {toast.type === 'success' && '✅'}
              {toast.type === 'warning' && '⚠️'}
              {toast.type === 'error' && '❌'}
              {toast.type === 'info' && '💡'}
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="font-bold text-xs text-slate-900 dark:text-white">{toast.title}</h5>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug break-words">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold leading-none p-1"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Top Header & Persona Control Bar */}
      <header
        className={`border-b sticky top-0 z-30 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 transition-colors ${
          isDarkMode
            ? 'border-slate-800 bg-slate-900/95 backdrop-blur-md shadow-md shadow-black/20'
            : 'border-slate-300/80 bg-white/95 backdrop-blur-md shadow-xs'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-blue-600 flex items-center justify-center font-extrabold text-white shadow-md shadow-indigo-500/25">
            OF
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-slate-950 dark:text-white">
                OnboardFlow AI
              </span>
              <span
                className={`text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full border ${
                  isDarkMode
                    ? 'bg-indigo-950 text-indigo-300 border-indigo-700/60'
                    : 'bg-indigo-100 text-indigo-950 border-indigo-300'
                }`}
              >
                System of Action
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Intelligent HRIS Onboarding Orchestration Layer</p>
          </div>
        </div>

        {/* Persona Control Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border shadow-xs ${
              isDarkMode
                ? 'bg-slate-950/80 border-slate-800'
                : 'bg-white border-slate-300'
            }`}
          >
            <span className="text-[11px] text-slate-800 dark:text-slate-300 font-extrabold uppercase tracking-wider">
              Persona:
            </span>
            <select
              value={currentUser?.id || ''}
              onChange={(e) => {
                const account = demoAccounts.find((a) => a.id === e.target.value);
                if (account) switchPersona(account);
              }}
              className={`bg-transparent text-xs font-extrabold focus:outline-none cursor-pointer ${
                isDarkMode ? 'text-indigo-300' : 'text-indigo-900'
              }`}
            >
              {demoAccounts.map((account) => (
                <option
                  key={account.id}
                  value={account.id}
                  className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-950 font-semibold'}
                >
                  {account.role === 'HR' && '👩‍💼 '}
                  {account.role === 'EMPLOYEE' && '💻 '}
                  {account.role === 'MANAGER' && '👔 '}
                  {account.role === 'IT' && '🛠️ '}
                  {account.role === 'SECURITY' && '🛡️ '}
                  {account.role === 'CAFETERIA' && '🥗 '}
                  {account.name} ({account.role} — {account.jobTitle})
                </option>
              ))}
            </select>
          </div>

          {/* Theme Toggle (Light / Dark) */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs ${
              isDarkMode
                ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
                : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100'
            }`}
            title="Toggle Light / Dark Theme"
          >
            {isDarkMode ? '☀️ Light' : '🌙 Dark'}
          </button>

          <button
            onClick={handleResetDemo}
            title="Reset demo data to initial seed"
            className="px-3.5 py-1.5 text-xs text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors font-bold shadow-2xs"
          >
            Reset Demo
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6">

        {/* ========================================================================= */}
        {/* VIEW A: HR DIRECTOR ORCHESTRATION VIEW                                    */}
        {/* ========================================================================= */}
        {currentUser?.role === 'HR' && (
          <div className="flex flex-col gap-6">
            <div
              className={`flex flex-wrap items-center justify-between gap-4 border-b pb-4 ${
                isDarkMode ? 'border-slate-800' : 'border-slate-300/80'
              }`}
            >
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                  HR Command Center
                </h1>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                  Ingest external candidate events, compile AI task graphs, approve plans, and audit cross-functional execution.
                </p>
              </div>

              {/* HR Tab Navigation */}
              <div
                className={`flex p-1 rounded-xl border text-xs ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-white border-slate-300 shadow-xs'
                }`}
              >
                <button
                  onClick={() => setHrTab('PIPELINE')}
                  className={`px-4 py-1.5 rounded-lg font-extrabold transition-all ${
                    hrTab === 'PIPELINE'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-800 hover:text-indigo-700 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  Onboarding Pipeline
                </button>
                <button
                  onClick={() => setHrTab('ALL_QUEUES')}
                  className={`px-4 py-1.5 rounded-lg font-extrabold transition-all ${
                    hrTab === 'ALL_QUEUES'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-800 hover:text-indigo-700 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  Global Department Queues
                </button>
                <button
                  onClick={() => setHrTab('AUDIT')}
                  className={`px-4 py-1.5 rounded-lg font-extrabold transition-all ${
                    hrTab === 'AUDIT'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-800 hover:text-indigo-700 dark:text-slate-300 dark:hover:text-white'
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
                <div
                  className={`border rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-200 ${
                    isDarkMode
                      ? 'bg-slate-900 border-slate-800'
                      : 'bg-white border-slate-300'
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                      </span>
                      <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-950 dark:text-white">
                        HRIS Inbound Webhook Simulator (Demo Boundary)
                      </h2>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-xl leading-relaxed">
                      Simulates synthetic <code className="text-indigo-700 dark:text-indigo-300 font-mono font-bold bg-indigo-50 dark:bg-indigo-950 px-1 py-0.5 rounded border border-indigo-200">employee.created</code> events from Workday / Darwinbox. Normalizes inbound payloads into canonical records in DRAFT state with SHA-256 idempotency protection.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => ingestSyntheticEvent('evt-hris-aarav-001')}
                      className="px-3.5 py-2 text-xs font-extrabold rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-950 hover:text-white border-2 border-indigo-300 hover:border-indigo-600 active:scale-95 transition-all shadow-2xs hover:shadow-xs"
                    >
                      + Ingest Aarav (Backend Eng)
                    </button>
                    <button
                      onClick={() => ingestSyntheticEvent('evt-hris-meera-002')}
                      className="px-3.5 py-2 text-xs font-extrabold rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-950 hover:text-white border-2 border-indigo-300 hover:border-indigo-600 active:scale-95 transition-all shadow-2xs hover:shadow-xs"
                    >
                      + Ingest Meera (Sales Exec)
                    </button>
                    <button
                      onClick={() => ingestSyntheticEvent('evt-hris-rohan-003')}
                      className="px-3.5 py-2 text-xs font-extrabold rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-950 hover:text-white border-2 border-indigo-300 hover:border-indigo-600 active:scale-95 transition-all shadow-2xs hover:shadow-xs"
                    >
                      + Ingest Rohan (Security)
                    </button>
                  </div>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div
                    className={`border rounded-2xl p-5 shadow-xs hover:-translate-y-0.5 transition-all duration-200 ${
                      isDarkMode
                        ? 'bg-slate-900 border-slate-800'
                        : 'bg-white border-slate-300'
                    }`}
                  >
                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                      Total Ingested Candidates
                    </span>
                    <div className="text-3xl font-black text-slate-950 dark:text-white mt-1.5">
                      {onboardings.length}
                    </div>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-0.5 block">System of Action Master</span>
                  </div>

                  <div
                    className={`border rounded-2xl p-5 shadow-xs hover:-translate-y-0.5 transition-all duration-200 ${
                      isDarkMode
                        ? 'bg-slate-900 border-slate-800'
                        : 'bg-white border-indigo-300'
                    }`}
                  >
                    <span className="text-xs font-extrabold text-indigo-950 dark:text-indigo-300 uppercase tracking-wide">
                      Active Parallel Orchestrations
                    </span>
                    <div className="text-3xl font-black text-indigo-700 dark:text-indigo-400 mt-1.5">
                      {onboardings.filter((o) => o.status === 'ACTIVE').length}
                    </div>
                    <span className="text-xs font-semibold text-indigo-800/90 dark:text-indigo-300 mt-0.5 block">Approved and running</span>
                  </div>

                  <div
                    className={`border rounded-2xl p-5 shadow-xs hover:-translate-y-0.5 transition-all duration-200 ${
                      isDarkMode
                        ? 'bg-slate-900 border-slate-800'
                        : 'bg-white border-amber-300'
                    }`}
                  >
                    <span className="text-xs font-extrabold text-amber-950 dark:text-amber-300 uppercase tracking-wide">
                      Awaiting HR Approval Gate
                    </span>
                    <div className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1.5">
                      {onboardings.filter((o) => o.status === 'PLAN_READY').length}
                    </div>
                    <span className="text-xs font-semibold text-amber-800/90 dark:text-amber-300 mt-0.5 block">AI plans compiled</span>
                  </div>

                  <div
                    className={`border rounded-2xl p-5 shadow-xs hover:-translate-y-0.5 transition-all duration-200 ${
                      isDarkMode
                        ? 'bg-slate-900 border-slate-800'
                        : 'bg-white border-rose-300'
                    }`}
                  >
                    <span className="text-xs font-extrabold text-rose-950 dark:text-rose-300 uppercase tracking-wide">
                      Operational Blockers
                    </span>
                    <div className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-1.5">
                      {onboardings.reduce((sum, o) => sum + o.blockedTaskCount, 0)}
                    </div>
                    <span className="text-xs font-semibold text-rose-800/90 dark:text-rose-300 mt-0.5 block">Action required by owners</span>
                  </div>
                </div>

                {/* Pipeline Table */}
                <div
                  className={`border rounded-2xl overflow-hidden shadow-xs ${
                    isDarkMode
                      ? 'bg-slate-900 border-slate-800'
                      : 'bg-white border-slate-300'
                  }`}
                >
                  <div
                    className={`px-6 py-4 border-b flex items-center justify-between ${
                      isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50/70'
                    }`}
                  >
                    <div>
                      <h3 className="font-extrabold text-slate-950 dark:text-white text-sm">
                        Live Onboarding Pipeline
                      </h3>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                        Trigger Azure AI compilation, review graphs, and activate queues
                      </p>
                    </div>
                    <button
                      onClick={refreshData}
                      className="text-xs text-indigo-700 dark:text-indigo-400 hover:underline font-extrabold flex items-center gap-1.5"
                    >
                      ↻ Refresh Pipeline
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead
                        className={`uppercase text-[11px] tracking-wider border-b font-black ${
                          isDarkMode
                            ? 'bg-slate-950/70 text-slate-300 border-slate-800'
                            : 'bg-slate-100 text-slate-900 border-slate-300'
                        }`}
                      >
                        <tr>
                          <th className="px-6 py-3.5">Candidate</th>
                          <th className="px-6 py-3.5">Role & Department</th>
                          <th className="px-6 py-3.5">Location & Start</th>
                          <th className="px-6 py-3.5">Workflow State</th>
                          <th className="px-6 py-3.5">Progress</th>
                          <th className="px-6 py-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody
                        className={`divide-y ${
                          isDarkMode
                            ? 'divide-slate-800 text-slate-200'
                            : 'divide-slate-200 text-slate-800'
                        }`}
                      >
                        {onboardings.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-600 font-semibold">
                              No candidates ingested yet. Click any simulator button above to ingest synthetic employee records.
                            </td>
                          </tr>
                        ) : (
                          onboardings.map((onb) => (
                            <tr
                              key={onb.id}
                              className={`transition-colors ${
                                isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-indigo-50/40'
                              }`}
                            >
                              <td className="px-6 py-4">
                                <div className="font-black text-slate-950 dark:text-white text-sm">
                                  {onb.employee ? `${onb.employee.firstName} ${onb.employee.lastName}` : onb.employeeId}
                                </div>
                                <div className="text-xs font-semibold text-slate-700 dark:text-slate-400">{onb.employee?.workEmail}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="font-bold text-slate-900 dark:text-slate-200">{onb.employee?.jobTitle}</div>
                                <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">{onb.employee?.department}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="font-semibold text-slate-900 dark:text-slate-200">{onb.employee?.location}</div>
                                <div className="text-xs font-medium text-slate-600 dark:text-slate-400">Day 1: {onb.employee?.startDate}</div>
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                    onb.status === 'COMPLETED'
                                      ? isDarkMode
                                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                        : 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                                      : onb.status === 'ACTIVE'
                                      ? isDarkMode
                                        ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                                        : 'bg-indigo-100 text-indigo-950 border border-indigo-300'
                                      : onb.status === 'PLAN_READY'
                                      ? isDarkMode
                                        ? 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                                        : 'bg-amber-100 text-amber-950 border border-amber-300 animate-pulse'
                                      : isDarkMode
                                      ? 'bg-slate-800 text-slate-300 border border-slate-700'
                                      : 'bg-slate-200 text-slate-900 border border-slate-300'
                                  }`}
                                >
                                  {onb.status}
                                </span>
                                {onb.blockedTaskCount > 0 && (
                                  <span
                                    className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                      isDarkMode
                                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                        : 'bg-rose-100 text-rose-950 border border-rose-300'
                                    }`}
                                  >
                                    {onb.blockedTaskCount} Blocked
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-24 rounded-full h-2.5 overflow-hidden border ${
                                      isDarkMode
                                        ? 'bg-slate-800 border-slate-700'
                                        : 'bg-slate-200 border-slate-300'
                                    }`}
                                  >
                                    <div
                                      className={`h-full transition-all duration-500 rounded-full ${
                                        onb.progressPercent === 100 ? 'bg-emerald-600' : 'bg-indigo-600'
                                      }`}
                                      style={{ width: `${onb.progressPercent}%` }}
                                    ></div>
                                  </div>
                                  <span className="font-black text-slate-950 dark:text-slate-100 text-xs">{onb.progressPercent}%</span>
                                </div>
                                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-1">
                                  {onb.completedTaskCount} of {onb.taskCount} tasks
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {onb.status === 'DRAFT' && (
                                    <button
                                      disabled={isCompiling}
                                      onClick={() => handleCompilePlan(onb.id)}
                                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold shadow-xs text-xs transition-all active:scale-95 flex items-center gap-1.5"
                                    >
                                      {isCompiling ? '⚡ Compiling...' : '⚡ Compile AI Plan'}
                                    </button>
                                  )}

                                  {onb.status === 'PLAN_READY' && (
                                    <button
                                      onClick={() => setSelectedPlanOnboarding(onb)}
                                      className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold shadow-xs text-xs transition-all active:scale-95"
                                    >
                                      Review & Approve
                                    </button>
                                  )}

                                  {onb.status === 'ACTIVE' && (
                                    <button
                                      onClick={() => setHrTab('ALL_QUEUES')}
                                      className={`px-3 py-1.5 rounded-xl font-bold border text-xs transition-all active:scale-95 shadow-2xs ${
                                        isDarkMode
                                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                                          : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                                      }`}
                                    >
                                      Inspect Tasks
                                    </button>
                                  )}

                                  <button
                                    onClick={() => handleViewAudit(onb.id)}
                                    className={`px-2.5 py-1.5 rounded-xl transition-colors text-xs font-semibold ${
                                      isDarkMode
                                        ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                                    }`}
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
                <div
                  className={`border rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4 ${
                    isDarkMode
                      ? 'bg-slate-900 border-slate-800'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Global Cross-Functional Task Oversight
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      HR master oversight across Security, IT, Manager, and Cafeteria queues.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {['ALL', 'SECURITY', 'IT', 'MANAGER', 'CAFETERIA'].map((s) => (
                      <button
                        key={s}
                        onClick={() => setHrQueueStakeholderFilter(s)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          hrQueueStakeholderFilter === s
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : isDarkMode
                            ? 'bg-slate-800 text-slate-400 hover:text-white'
                            : 'bg-slate-100 text-slate-600 hover:text-slate-900'
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
                        className={`border rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-sm ${
                          isDarkMode
                            ? task.status === 'BLOCKED'
                              ? 'border-rose-800/80 bg-rose-950/10'
                              : task.status === 'COMPLETED'
                              ? 'border-emerald-800/60 bg-emerald-950/10'
                              : 'bg-slate-900 border-slate-800'
                            : task.status === 'BLOCKED'
                            ? 'border-rose-300 bg-rose-50/50'
                            : task.status === 'COMPLETED'
                            ? 'border-emerald-200 bg-emerald-50/40'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                isDarkMode
                                  ? 'bg-slate-800 text-indigo-300'
                                  : 'bg-slate-100 text-indigo-700'
                              }`}
                            >
                              {task.stakeholder} • {task.category}
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                task.status === 'COMPLETED'
                                  ? isDarkMode
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : task.status === 'IN_PROGRESS'
                                  ? isDarkMode
                                    ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                  : task.status === 'BLOCKED'
                                  ? isDarkMode
                                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : isDarkMode
                                  ? 'bg-slate-800 text-slate-400'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {task.status}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">{task.title}</h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 line-clamp-2">{task.description}</p>
                          {task.blockerReason && (
                            <div
                              className={`mt-2.5 p-2 rounded-xl text-[11px] ${
                                isDarkMode
                                  ? 'bg-rose-950/40 border border-rose-800 text-rose-300'
                                  : 'bg-rose-50 border border-rose-200 text-rose-700'
                              }`}
                            >
                              ⚠️ Blocked: {task.blockerReason}
                            </div>
                          )}
                        </div>
                        <div
                          className={`pt-3 border-t text-[11px] flex items-center justify-between ${
                            isDarkMode
                              ? 'border-slate-800 text-slate-400'
                              : 'border-slate-100 text-slate-500'
                          }`}
                        >
                          <span>Priority: <strong className="text-slate-900 dark:text-slate-200">{task.priority}</strong></span>
                          <span>Prereqs: {task.dependsOnTaskIds?.length || 0}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* TAB 3: HR AUDIT TIMELINE */}
            {hrTab === 'AUDIT' && (
              <div
                className={`border rounded-2xl p-6 shadow-sm flex flex-col gap-4 ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Full Governance & Audit Trail
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select an onboarding candidate from the Pipeline tab and click &quot;📋 Audit&quot; to review cryptographic lifecycle events, state mutations, and model telemetry.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW B: FUNCTIONAL STAKEHOLDER QUEUE VIEW                                 */}
        {/* ========================================================================= */}
        {['IT', 'SECURITY', 'CAFETERIA', 'MANAGER'].includes(currentUser?.role || '') && (
          <div className="flex flex-col gap-6">
            <div
              className={`border rounded-2xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4 ${
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      isDarkMode
                        ? 'bg-indigo-950 text-indigo-300 border-indigo-700'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    }`}
                  >
                    {currentUser?.role} Queue
                  </span>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Authorized Work Items for {currentUser?.name}
                  </h1>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Stakeholder isolation enforced: You may only view and mutate tasks assigned to your authorized queue.
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div
                className={`flex p-1 rounded-xl border text-xs ${
                  isDarkMode
                    ? 'bg-slate-950 border-slate-800'
                    : 'bg-slate-100 border-slate-200'
                }`}
              >
                {(['ALL', 'PENDING', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setQueueFilter(status)}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      queueFilter === status
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : isDarkMode
                        ? 'text-slate-400 hover:text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Task Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTasks.length === 0 ? (
                <div
                  className={`col-span-full py-16 text-center rounded-2xl border ${
                    isDarkMode
                      ? 'bg-slate-900/60 border-slate-800/80 text-slate-500'
                      : 'bg-white border-slate-200 text-slate-400'
                  }`}
                >
                  No active tasks found under status &apos;{queueFilter}&apos;. (If you just ingested an employee, ensure HR has compiled and approved the plan).
                </div>
              ) : (
                filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`border rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ${
                      isDarkMode
                        ? task.status === 'BLOCKED'
                          ? 'border-rose-800/80 bg-rose-950/15'
                          : task.status === 'COMPLETED'
                          ? 'border-emerald-800/60 bg-emerald-950/15'
                          : task.status === 'IN_PROGRESS'
                          ? 'border-indigo-600/90 shadow-indigo-950/30'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                        : task.status === 'BLOCKED'
                        ? 'border-rose-300 bg-rose-50/70 shadow-xs'
                        : task.status === 'COMPLETED'
                        ? 'border-emerald-300 bg-emerald-50/60 shadow-xs'
                        : task.status === 'IN_PROGRESS'
                        ? 'border-indigo-300 bg-indigo-50/50 shadow-xs'
                        : 'bg-white border-slate-300 hover:border-slate-400 shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border ${
                            isDarkMode
                              ? 'bg-slate-800 text-slate-300 border-slate-700'
                              : 'bg-slate-100 text-slate-800 border-slate-300'
                          }`}
                        >
                          {task.category}
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            task.status === 'COMPLETED'
                              ? isDarkMode
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                              : task.status === 'IN_PROGRESS'
                              ? isDarkMode
                                ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                                : 'bg-indigo-100 text-indigo-950 border border-indigo-300'
                              : task.status === 'BLOCKED'
                              ? isDarkMode
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : 'bg-rose-100 text-rose-950 border border-rose-300'
                              : isDarkMode
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-slate-200 text-slate-900 border border-slate-300'
                          }`}
                        >
                          {task.status}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-sm text-slate-950 dark:text-white leading-snug">
                        {task.title}
                      </h4>
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-2 line-clamp-3">
                        {task.instructions || task.description}
                      </p>

                      {task.reason && (
                        <div
                          className={`mt-3 p-2.5 rounded-xl border text-[11px] ${
                            isDarkMode
                              ? 'bg-slate-950 border-slate-800 text-slate-300'
                              : 'bg-slate-100/90 border-slate-300 text-slate-900 font-medium'
                          }`}
                        >
                          <span className="font-extrabold text-indigo-700 dark:text-indigo-400">
                            Policy Grounding:{' '}
                          </span>
                          {task.reason}
                        </div>
                      )}

                      {task.status === 'BLOCKED' && task.blockerReason && (
                        <div
                          className={`mt-2.5 p-2.5 rounded-xl border text-[11px] ${
                            isDarkMode
                              ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                              : 'bg-rose-100/90 border-rose-300 text-rose-950 font-bold'
                          }`}
                        >
                          <span className="font-black">⚠️ Blocked: </span>
                          {task.blockerReason}
                        </div>
                      )}
                    </div>

                    {/* Execution Actions */}
                    <div
                      className={`pt-3 border-t flex items-center justify-between gap-2 ${
                        isDarkMode ? 'border-slate-800' : 'border-slate-200'
                      }`}
                    >
                      {task.status !== 'COMPLETED' ? (
                        <>
                          {task.status !== 'IN_PROGRESS' ? (
                            <button
                              onClick={() => handleUpdateTask(task.id, 'IN_PROGRESS')}
                              className="flex-1 py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs transition-all shadow-xs"
                            >
                              Start Task
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateTask(task.id, 'COMPLETED')}
                              className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs transition-all shadow-xs"
                            >
                              ✓ Mark Complete
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setBlockerModalTask(task);
                              setBlockerInput('');
                            }}
                            className={`py-1.5 px-3 rounded-xl font-semibold text-xs transition-all active:scale-95 border ${
                              isDarkMode
                                ? 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border-rose-800/60'
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                            }`}
                          >
                            Block
                          </button>
                        </>
                      ) : (
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 cols: Employee Progress Journey */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {/* Profile Welcome Banner */}
              <div
                className={`border rounded-3xl p-6 shadow-sm transition-colors ${
                  isDarkMode
                    ? 'bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900 border-indigo-800/40'
                    : 'bg-white border border-slate-300 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-xl font-bold text-white shadow-md shadow-indigo-500/20">
                    {currentEmployeeOnboarding?.employee?.firstName?.[0] || 'C'}
                  </div>
                  <div>
                    <h1 className="text-xl font-black text-slate-950 dark:text-white">
                      Welcome, {currentEmployeeOnboarding?.employee?.firstName}{' '}
                      {currentEmployeeOnboarding?.employee?.lastName}!
                    </h1>
                    <p className="text-xs text-indigo-700 dark:text-indigo-400 font-extrabold mt-0.5">
                      {currentEmployeeOnboarding?.employee?.jobTitle} •{' '}
                      {currentEmployeeOnboarding?.employee?.department}
                    </p>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1">
                      Office: <span className="font-bold text-slate-900 dark:text-white">{currentEmployeeOnboarding?.employee?.location}</span> | Manager:{' '}
                      <span className="font-bold text-slate-900 dark:text-white">{currentEmployeeOnboarding?.employee?.managerName || 'Unassigned'}</span>
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div
                  className={`mt-6 pt-5 border-t ${
                    isDarkMode ? 'border-slate-800' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-extrabold text-slate-900 dark:text-slate-200">
                      Live Journey Completion
                    </span>
                    <span className="font-black text-indigo-700 dark:text-indigo-400 text-sm">
                      {currentEmployeeOnboarding?.progressPercent || 0}%
                    </span>
                  </div>
                  <div
                    className={`w-full rounded-full h-3.5 overflow-hidden border ${
                      isDarkMode
                        ? 'bg-slate-800 border-slate-700'
                        : 'bg-slate-200 border-slate-300'
                    }`}
                  >
                    <div
                      className="bg-gradient-to-r from-indigo-600 to-emerald-500 h-full transition-all duration-700 rounded-full"
                      style={{ width: `${currentEmployeeOnboarding?.progressPercent || 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Parallel Tracks Grid */}
              <div
                className={`border rounded-3xl p-6 shadow-sm ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border border-slate-300'
                }`}
              >
                <h3 className="font-black text-sm text-slate-950 dark:text-white mb-4">
                  Parallel Cross-Functional Tracks
                </h3>
                <div className="grid grid-cols-2 gap-3.5">
                  <div
                    className={`p-4 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 ${
                      isDarkMode
                        ? 'bg-slate-950 border-slate-800/90'
                        : 'bg-slate-50 border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-black text-slate-950 dark:text-slate-100">
                      <span>🛡️</span> Security Clearance
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1.5 leading-relaxed">
                      RFID Badging, FIDO2 MFA key enrollment, and office physical access.
                    </p>
                  </div>

                  <div
                    className={`p-4 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 ${
                      isDarkMode
                        ? 'bg-slate-950 border-slate-800/90'
                        : 'bg-slate-50 border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-black text-slate-950 dark:text-slate-100">
                      <span>🛠️</span> IT Equipment & Cloud
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1.5 leading-relaxed">
                      Workstation staging, Entra SSO identity, and developer repos.
                    </p>
                  </div>

                  <div
                    className={`p-4 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 ${
                      isDarkMode
                        ? 'bg-slate-950 border-slate-800/90'
                        : 'bg-slate-50 border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-black text-slate-950 dark:text-slate-100">
                      <span>🥗</span> Workplace & Meal Pass
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1.5 leading-relaxed">
                      Ergonomic desk assignment and monthly digital cafeteria stipend.
                    </p>
                  </div>

                  <div
                    className={`p-4 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 ${
                      isDarkMode
                        ? 'bg-slate-950 border-slate-800/90'
                        : 'bg-slate-50 border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-black text-slate-950 dark:text-slate-100">
                      <span>👔</span> Manager Ramp-up
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1.5 leading-relaxed">
                      Day 1 technical 1:1, onboarding buddy introduction, and milestones.
                    </p>
                  </div>
                </div>
              </div>

              {/* Employee Assigned Action Items Checklist */}
              <div
                className={`border rounded-3xl p-6 shadow-sm flex flex-col gap-4 transition-all duration-200 ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border border-slate-300'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-black text-sm text-slate-950 dark:text-white flex items-center gap-2">
                      <span>📋</span> Your Onboarding Milestones & Action Items
                    </h3>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-0.5">
                      Real-time status of your departmental onboarding deliverables.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-200/90 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 p-1 rounded-xl text-[11px] font-bold">
                    {(['ALL', 'PENDING', 'COMPLETED'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setEmployeeTaskFilter(filter)}
                        className={`px-3 py-1 rounded-lg transition-all active:scale-95 ${
                          employeeTaskFilter === filter
                            ? 'bg-indigo-600 text-white shadow-xs font-black'
                            : 'text-slate-800 dark:text-slate-300 hover:text-slate-950'
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
                        className={`p-3.5 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 flex items-start gap-3 ${
                          task.status === 'COMPLETED'
                            ? isDarkMode
                              ? 'bg-emerald-950/20 border-emerald-900/40 text-slate-300'
                              : 'bg-emerald-50/60 border-emerald-300 text-slate-900 shadow-2xs'
                            : isDarkMode
                            ? 'bg-slate-950 border-slate-800 text-slate-200'
                            : 'bg-slate-50 border-slate-300 text-slate-950 shadow-2xs hover:border-slate-400'
                        }`}
                      >
                        <div className="mt-0.5">
                          {task.status === 'COMPLETED' ? (
                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black shadow-xs">
                              ✓
                            </span>
                          ) : task.status === 'IN_PROGRESS' ? (
                            <span className="relative flex h-4 w-4 mt-0.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-600"></span>
                            </span>
                          ) : (
                            <span className="w-4 h-4 rounded-full border-2 border-slate-400 dark:border-slate-600 block mt-0.5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <span className={`text-xs font-black ${task.status === 'COMPLETED' ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-950 dark:text-white'}`}>
                              {task.title}
                            </span>
                            <span
                              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                task.status === 'COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                                  : task.status === 'IN_PROGRESS'
                                  ? 'bg-indigo-100 text-indigo-950 border border-indigo-300'
                                  : task.status === 'BLOCKED'
                                  ? 'bg-rose-100 text-rose-950 border border-rose-300'
                                  : 'bg-slate-200 text-slate-950 border border-slate-300'
                              }`}
                            >
                              {task.stakeholder} • {task.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1 line-clamp-2">
                            {task.instructions || task.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  {tasks.length === 0 && (
                    <div className="p-6 text-center text-xs text-slate-600 dark:text-slate-400 font-bold">
                      No tasks currently active for this candidate.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right 5 cols: State-Aware Copilot Widget */}
            <div
              className={`lg:col-span-5 flex flex-col border rounded-3xl shadow-md overflow-hidden h-[660px] ${
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border border-slate-300'
              }`}
            >
              {/* Copilot Header */}
              <div
                className={`px-5 py-4 border-b flex items-center justify-between ${
                  isDarkMode ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-slate-100/90'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-sm font-bold text-white shadow-xs">
                    🤖
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-950 dark:text-white">
                      OnboardFlow Copilot
                    </h3>
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-extrabold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Zero-waste state resolver active
                    </p>
                  </div>
                </div>
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
                          ? 'bg-indigo-600 text-white rounded-br-none shadow-xs'
                          : isDarkMode
                          ? 'bg-slate-800/90 text-slate-200 rounded-bl-none border border-slate-700/80 shadow-xs'
                          : 'bg-white text-slate-950 font-medium rounded-bl-none border border-slate-300 shadow-xs'
                      }`}
                    >
                      <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>

                      {/* Source & Token Diagnostics */}
                      {msg.source && (
                        <div
                          className={`mt-2.5 pt-2 border-t flex flex-wrap items-center gap-1.5 text-[9px] ${
                            isDarkMode
                              ? 'border-slate-700/60 text-slate-400'
                              : 'border-slate-200 text-slate-700 font-bold'
                          }`}
                        >
                          <span
                            className={`font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              isDarkMode
                                ? 'bg-slate-950 text-indigo-300'
                                : 'bg-indigo-100 text-indigo-950 border border-indigo-200'
                            }`}
                          >
                            {msg.source === 'STATE' && '⚡ DB / Live State Fact'}
                            {msg.source === 'PROFILE' && '👤 DB Profile Fact'}
                            {msg.source === 'GRAPH' && '🕸️ Task Graph Resolver'}
                            {msg.source === 'POLICY_AI' && '🧠 Azure AI (gpt-5-mini)'}
                          </span>
                          <span className="font-extrabold">• {msg.tokensUsed} tokens</span>
                        </div>
                      )}

                      {/* Policy Citations */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-2 text-[9px] text-slate-700 dark:text-slate-400">
                          <span className="font-extrabold text-slate-950 dark:text-slate-200">Citations: </span>
                          {msg.citations.map((c, i) => (
                            <span key={i} className="underline mr-1.5 font-bold">
                              [{c.documentTitle}: {c.section}]
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isCopilotTyping && (
                  <div className="self-start flex items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs shadow-xs animate-fade-in-up">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Copilot resolving state</span>
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
              <div
                className={`px-4 py-2.5 border-t flex flex-wrap gap-1.5 ${
                  isDarkMode
                    ? 'border-slate-800 bg-slate-950/50'
                    : 'border-slate-200 bg-slate-100/90'
                }`}
              >
                <button
                  onClick={() => handleSendCopilot('What are my tasks?')}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border hover:scale-105 active:scale-95 ${
                    isDarkMode
                      ? 'bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white border-slate-700'
                      : 'bg-white hover:bg-indigo-600 text-slate-900 hover:text-white border border-slate-300 hover:border-indigo-600 shadow-2xs'
                  }`}
                >
                  📋 What are my tasks?
                </button>
                <button
                  onClick={() => handleSendCopilot('Where are we?')}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border hover:scale-105 active:scale-95 ${
                    isDarkMode
                      ? 'bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white border-slate-700'
                      : 'bg-white hover:bg-indigo-600 text-slate-900 hover:text-white border border-slate-300 hover:border-indigo-600 shadow-2xs'
                  }`}
                >
                  📍 Where are we?
                </button>
                <button
                  onClick={() => handleSendCopilot('Is my laptop ready?')}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border hover:scale-105 active:scale-95 ${
                    isDarkMode
                      ? 'bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white border-slate-700'
                      : 'bg-white hover:bg-indigo-600 text-slate-900 hover:text-white border border-slate-300 hover:border-indigo-600 shadow-2xs'
                  }`}
                >
                  💻 Is my laptop ready?
                </button>
                <button
                  onClick={() => handleSendCopilot('Who is my manager?')}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border hover:scale-105 active:scale-95 ${
                    isDarkMode
                      ? 'bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white border-slate-700'
                      : 'bg-white hover:bg-indigo-600 text-slate-900 hover:text-white border border-slate-300 hover:border-indigo-600 shadow-2xs'
                  }`}
                >
                  👤 Who is my manager?
                </button>
                <button
                  onClick={() => handleSendCopilot('What is the policy for High-Security Lab access?')}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border hover:scale-105 active:scale-95 ${
                    isDarkMode
                      ? 'bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white border-slate-700'
                      : 'bg-white hover:bg-indigo-600 text-slate-900 hover:text-white border border-slate-300 hover:border-indigo-600 shadow-2xs'
                  }`}
                >
                  📜 Lab access policy?
                </button>
              </div>

              {/* Chat Input */}
              <div
                className={`p-3 border-t flex gap-2 ${
                  isDarkMode
                    ? 'border-slate-800 bg-slate-950'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendCopilot()}
                  placeholder="Ask a question..."
                  className={`flex-1 rounded-xl px-3.5 py-2 text-xs border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDarkMode
                      ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-300 text-slate-950 placeholder-slate-500 font-medium'
                  }`}
                />
                <button
                  onClick={() => handleSendCopilot()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className={`border rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border border-slate-300 text-slate-950'
            }`}
          >
            <div
              className={`px-6 py-4 border-b flex items-center justify-between ${
                isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-100/90'
              }`}
            >
              <div>
                <h3 className="font-black text-base text-slate-950 dark:text-white">
                  Review AI Compiled Onboarding Plan
                </h3>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  Candidate: <span className="font-bold text-slate-950 dark:text-white">{selectedPlanOnboarding.employee?.firstName} {selectedPlanOnboarding.employee?.lastName}</span> (
                  {selectedPlanOnboarding.employee?.jobTitle} • {selectedPlanOnboarding.employee?.department})
                </p>
              </div>
              <button
                onClick={() => setSelectedPlanOnboarding(null)}
                className="text-slate-500 hover:text-slate-900 dark:hover:text-white text-lg font-bold p-1 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs">
              <div
                className={`p-4 border rounded-2xl ${
                  isDarkMode
                    ? 'bg-indigo-950/40 border-indigo-800/80 text-slate-200'
                    : 'bg-indigo-50 border border-indigo-200 text-indigo-950 font-medium'
                }`}
              >
                <span className="font-extrabold text-indigo-900 dark:text-indigo-300 block mb-1">
                  AI Executive Summary:
                </span>
                {selectedPlanOnboarding.draftPlan?.summary || 'No summary compiled.'}
              </div>

              <h4 className="font-black text-slate-950 dark:text-white text-sm mt-2">
                Proposed Parallel Task Graph ({selectedPlanOnboarding.draftPlan?.tasks.length || 0} tasks):
              </h4>

              <div className="flex flex-col gap-2.5">
                {selectedPlanOnboarding.draftPlan?.tasks.map((task, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-2xl border flex flex-col gap-1.5 ${
                      isDarkMode
                        ? 'bg-slate-950 border-slate-800'
                        : 'bg-slate-50 border border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-slate-950 dark:text-white">
                        [{task.stakeholder}] {task.title}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          isDarkMode
                            ? 'bg-slate-800 text-slate-300'
                            : 'bg-slate-200 text-slate-900 border border-slate-300'
                        }`}
                      >
                        {task.priority} Priority
                      </span>
                    </div>
                    <p className="text-slate-800 dark:text-slate-300 text-xs font-medium leading-relaxed">
                      {task.description}
                    </p>
                    <div className="text-[11px] text-indigo-800 dark:text-indigo-300 font-medium">
                      <span className="font-bold text-slate-900 dark:text-slate-200">Reason: </span>
                      {task.reason}
                    </div>
                    {task.dependsOnClientTaskIds && task.dependsOnClientTaskIds.length > 0 && (
                      <div className="text-[11px] text-amber-800 dark:text-amber-400 font-bold">
                        Prerequisites: {task.dependsOnClientTaskIds.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div
              className={`px-6 py-4 border-t flex items-center justify-end gap-3 ${
                isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-100/90'
              }`}
            >
              <button
                onClick={() => setSelectedPlanOnboarding(null)}
                className="px-4 py-2 rounded-xl text-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => handleApprovePlan(selectedPlanOnboarding.id)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-colors"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className={`border rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 ${
              isDarkMode
                ? 'bg-slate-900 border-rose-800/80 text-white'
                : 'bg-white border-2 border-rose-400 text-slate-950 shadow-xl'
            }`}
          >
            <h3 className="font-black text-base text-rose-700 dark:text-rose-400">Report Operational Blocker</h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">Task: <span className="font-bold text-slate-950 dark:text-white">{blockerModalTask.title}</span></p>
            <textarea
              rows={3}
              value={blockerInput}
              onChange={(e) => setBlockerInput(e.target.value)}
              placeholder="State the reason why this task is blocked (e.g. Awaiting hardware shipment from vendor)..."
              className={`w-full border rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                isDarkMode
                  ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500'
                  : 'bg-slate-50 border-slate-300 text-slate-950 placeholder-slate-500 font-medium'
              }`}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setBlockerModalTask(null)}
                className="px-3.5 py-1.5 rounded-xl text-slate-700 hover:text-slate-950 dark:hover:text-white text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateTask(blockerModalTask.id, 'BLOCKED', blockerInput)}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
              >
                Submit Blocker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: AUDIT TRAIL MODAL                                                */}
      {/* ========================================================================= */}
      {auditLogEvents && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className={`border rounded-3xl max-w-xl w-full max-h-[75vh] flex flex-col shadow-2xl overflow-hidden ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-950'
            }`}
          >
            <div
              className={`px-6 py-4 border-b flex items-center justify-between ${
                isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-100/90'
              }`}
            >
              <h3 className="font-black text-sm text-slate-950 dark:text-white">
                Chronological Audit Timeline
              </h3>
              <button
                onClick={() => setAuditLogEvents(null)}
                className="text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold text-base transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3 text-xs">
              {auditLogEvents.map((evt) => (
                <div
                  key={evt.id}
                  className={`p-3.5 border rounded-2xl flex flex-col gap-1 ${
                    isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-indigo-700 dark:text-indigo-400">{evt.eventType}</span>
                    <span className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold">
                      {new Date(evt.timestamp).toLocaleTimeString()} • Role: {evt.actorRole}
                    </span>
                  </div>
                  <pre
                    className={`text-[10px] p-2.5 rounded-xl overflow-x-auto ${
                      isDarkMode
                        ? 'bg-slate-900 text-slate-300'
                        : 'bg-slate-100 text-slate-800 border border-slate-200 font-mono'
                    }`}
                  >
                    {JSON.stringify(evt.details, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
