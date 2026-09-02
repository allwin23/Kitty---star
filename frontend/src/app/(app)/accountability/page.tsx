'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { HeaderTitleCard } from '@/components/ui/HeaderTitleCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Loading } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  getCurrentPlan,
  getDraft,
  getInitialPlan,
  getPartnerCurrentPlan,
  getPartnerSubmission,
  getPartnerProfile,
} from '@/services/planner-read.service';
import { plannerService } from '@/services/backend';
import { todayIso, daysAgoIso } from '@/lib/supabase-helpers';
import { useAuthStore, usePomodoroStore } from '@/stores';
import { format, addDays } from 'date-fns';
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Play,
  Send,
  Users,
  Eye,
  Clock,
  Flame,
  Calendar,
  Sparkles,
} from 'lucide-react';
import clsx from 'clsx';

export default function AccountabilityPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { setSelectedTaskId, setSessionType, setDurationMinutes, startTimer } =
    usePomodoroStore();

  const today = todayIso();
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskMinutes, setNewTaskMinutes] = useState('30');
  const [newDraftTitle, setNewDraftTitle] = useState('');
  const [newDraftMinutes, setNewDraftMinutes] = useState('30');
  const [activeTab, setActiveTab] = useState<'today' | 'tomorrow'>('today');

  // Queries
  const currentPlanQ = useQuery({
    queryKey: ['current-plan', today],
    queryFn: () => getCurrentPlan(today),
    enabled: !!user,
  });

  const initialPlanQ = useQuery({
    queryKey: ['initial-plan', today],
    queryFn: () => getInitialPlan(today),
    enabled: !!user,
  });

  const tomorrowDraftQ = useQuery({
    queryKey: ['planner-draft', tomorrow],
    queryFn: () => getDraft(tomorrow),
    enabled: !!user,
  });

  const partnerPlanQ = useQuery({
    queryKey: ['partner-current-plan', today],
    queryFn: () => getPartnerCurrentPlan(today),
    enabled: !!user,
  });

  const partnerSubmissionQ = useQuery({
    queryKey: ['partner-submission'],
    queryFn: () => getPartnerSubmission(),
    enabled: !!user,
  });

  const partnerProfileQ = useQuery({
    queryKey: ['partner-profile'],
    queryFn: () => getPartnerProfile(),
    enabled: !!user,
  });

  const currentPlan = currentPlanQ.data;
  const initialPlan = initialPlanQ.data;
  const tomorrowDraft = tomorrowDraftQ.data;
  const partnerPlan = partnerPlanQ.data;
  const partnerSubmission = partnerSubmissionQ.data;
  const partnerProfile = partnerProfileQ.data;

  // Toggle task completion
  const toggleTaskMutation = useMutation({
    mutationFn: ({ taskId, completed }: { taskId: string; completed: boolean }) =>
      plannerService.toggleTask(taskId, completed),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['current-plan', today] });
    },
  });

  // Add task to today's plan
  const addTaskMutation = useMutation({
    mutationFn: async () => {
      if (!currentPlan?.id || !newTaskTitle.trim()) return;
      await plannerService.addTask({
        plan_id: currentPlan.id,
        title: newTaskTitle.trim(),
        estimated_minutes: parseInt(newTaskMinutes, 10) || 30,
        order: (currentPlan.current_tasks?.length ?? 0) + 1,
      });
    },
    onSuccess: () => {
      setNewTaskTitle('');
      void queryClient.invalidateQueries({ queryKey: ['current-plan', today] });
    },
  });

  // Delete task
  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => plannerService.deleteTask(taskId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['current-plan', today] });
    },
  });

  // Start pomodoro with this task
  const handleStartPomodoroOnTask = (task: any) => {
    setSelectedTaskId(task.id);
    setSessionType('focus');
    setDurationMinutes(task.estimated_minutes || 25);
    router.push('/pomodoro');
  };

  const tasks = (currentPlan?.current_tasks ?? []) as any[];
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <HeaderTitleCard
            title="Daily Plan & Accountability"
            subtitle={`${format(new Date(), 'EEEE, MMMM d, yyyy')} • Mutual verification`}
          />
          <div className="flex items-center gap-2">
            <Link href="/accountability/reports">
              <Button variant="secondary" size="sm" icon={<Calendar className="w-3.5 h-3.5" />}>
                History Reports
              </Button>
            </Link>
            <Link href="/accountability/submit">
              <Button size="sm" icon={<Send className="w-3.5 h-3.5" />}>
                Submit Proof
              </Button>
            </Link>
          </div>
        </div>

        {/* Pending Partner Review Banner */}
        {partnerSubmission && (
          <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                ⭐
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-amber-950">
                  {partnerProfile?.full_name || 'Study Partner'} Submitted Today&apos;s Proof!
                </h4>
                <p className="text-xs font-semibold text-amber-800">
                  Inspect their photo evidence and approve before the 11:00 AM deadline to award XP!
                </p>
              </div>
            </div>
            <Link href={`/accountability/review?submissionId=${partnerSubmission.id}`}>
              <Button size="sm" className="!bg-amber-600 hover:!bg-amber-700 text-white shrink-0">
                Review Proof Now
              </Button>
            </Link>
          </Card>
        )}

        {/* Tab switcher: Today Tasks vs Tomorrow Planning */}
        <div className="flex rounded-[20px] bg-white/90 p-1 border border-[#FAD7E0] max-w-sm">
          <button
            onClick={() => setActiveTab('today')}
            className={clsx(
              'flex-1 py-2 text-xs font-black rounded-[16px] transition-all',
              activeTab === 'today'
                ? 'bg-[#C73A57] text-white shadow-xs'
                : 'text-[#66545B] hover:text-[#C73A57]'
            )}
          >
            Today&apos;s Active Tasks ({completedCount}/{tasks.length})
          </button>
          <button
            onClick={() => setActiveTab('tomorrow')}
            className={clsx(
              'flex-1 py-2 text-xs font-black rounded-[16px] transition-all',
              activeTab === 'tomorrow'
                ? 'bg-[#C73A57] text-white shadow-xs'
                : 'text-[#66545B] hover:text-[#C73A57]'
            )}
          >
            Plan Tomorrow
          </button>
        </div>

        {activeTab === 'today' ? (
          <div className="space-y-5">
            {/* Today's Checklist Card */}
            <Card className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-[#2A1D22] flex items-center gap-2">
                    <span>Today&apos;s Tasks Checklist</span>
                    <span className="text-xs font-bold text-[#E84D72] bg-[#FFE4EB] px-2.5 py-0.5 rounded-full">
                      {progressPercent}% Done
                    </span>
                  </h3>
                  <p className="text-xs text-[#66545B]">
                    Complete all tasks and attach proof before submitting to partner.
                  </p>
                </div>

                <Link href="/accountability/submit">
                  <Button size="sm" variant="primary" icon={<Send className="w-3.5 h-3.5" />}>
                    Submit Day
                  </Button>
                </Link>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-[#FFE4EB] h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#C73A57] to-[#E84D72] h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Task Items */}
              {currentPlanQ.isLoading ? (
                <Loading message="Fetching tasks…" />
              ) : tasks.length === 0 ? (
                <EmptyState
                  title="No tasks scheduled for today"
                  description="Add your first study task below or auto-create your morning plan!"
                />
              ) : (
                <div className="space-y-2 pt-1">
                  {tasks.map((task) => {
                    const isDone = task.status === 'completed';
                    return (
                      <div
                        key={task.id}
                        className={clsx(
                          'flex items-center justify-between p-3.5 rounded-[18px] border transition-all',
                          isDone
                            ? 'bg-emerald-50/70 border-emerald-200 opacity-80'
                            : 'bg-[#FFF7F8] border-[#FFE4EB] hover:border-[#FAD7E0]'
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            onClick={() =>
                              toggleTaskMutation.mutate({
                                taskId: task.id,
                                completed: !isDone,
                              })
                            }
                            className="shrink-0 transition-transform active:scale-90"
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                            ) : (
                              <Circle className="w-5 h-5 text-[#BFAFB5] hover:text-[#C73A57]" />
                            )}
                          </button>

                          <div className="min-w-0">
                            <p
                              className={clsx(
                                'text-sm font-bold truncate',
                                isDone ? 'line-through text-[#66545B]' : 'text-[#2A1D22]'
                              )}
                            >
                              {task.title}
                            </p>
                            <span className="text-[11px] font-semibold text-[#66545B] flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[#E84D72]" />
                              {task.estimated_minutes} min block
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-3">
                          {!isDone && (
                            <button
                              onClick={() => handleStartPomodoroOnTask(task)}
                              title="Start Pomodoro Focus"
                              className="w-8 h-8 rounded-[12px] bg-[#FFE4EB] hover:bg-[#C73A57] text-[#C73A57] hover:text-white flex items-center justify-center transition-colors shadow-2xs"
                            >
                              <Play className="w-4 h-4 fill-current" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteTaskMutation.mutate(task.id)}
                            title="Delete Task"
                            className="w-8 h-8 rounded-[12px] bg-transparent hover:bg-rose-100 text-[#BFAFB5] hover:text-[#D94C61] flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Task Input Form */}
              <div className="pt-3 border-t border-[#FFE4EB] flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  placeholder="Add a new task (e.g. Chapter 4 Chemistry Revision)…"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTaskMutation.mutate()}
                  className="flex-1 bg-[#FFF3F5] text-sm font-medium rounded-[16px] px-4 py-2.5 border border-[#FAD7E0] outline-none focus:bg-white focus:border-[#E84D72] w-full"
                />
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={newTaskMinutes}
                    onChange={(e) => setNewTaskMinutes(e.target.value)}
                    className="bg-[#FFF3F5] text-xs font-bold rounded-[16px] px-3 py-2.5 border border-[#FAD7E0] outline-none text-[#2A1D22]"
                  >
                    <option value="15">15 mins</option>
                    <option value="25">25 mins</option>
                    <option value="30">30 mins</option>
                    <option value="45">45 mins</option>
                    <option value="60">60 mins</option>
                    <option value="90">90 mins</option>
                  </select>
                  <Button
                    size="sm"
                    onClick={() => addTaskMutation.mutate()}
                    loading={addTaskMutation.isPending}
                    className="shrink-0"
                    icon={<Plus className="w-4 h-4" />}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </Card>

            {/* Partner's Live Task Progress Card */}
            <Card className="space-y-3 bg-white/95">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#C73A57]" />
                  <h4 className="text-sm font-extrabold text-[#2A1D22]">
                    {partnerProfile?.full_name || 'Study Partner&apos;s'} Live Tasks
                  </h4>
                </div>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Live Synced
                </span>
              </div>

              {!partnerProfile?.id ? (
                <EmptyState
                  title="No partner connected yet"
                  description="Pair with your study buddy via invite code to view each other's live tasks!"
                  action={
                    <Link href="/partner-linking">
                      <Button size="sm">Connect Partner</Button>
                    </Link>
                  }
                />
              ) : !partnerPlan ? (
                <p className="text-xs text-[#66545B] italic py-2">
                  Your partner hasn&apos;t started their plan yet today.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {(partnerPlan.current_tasks ?? []).map((pt: any) => (
                    <div
                      key={pt.id}
                      className="flex items-center justify-between p-2.5 rounded-[14px] bg-[#FFF3F5] text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {pt.status === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Circle className="w-4 h-4 text-[#BFAFB5]" />
                        )}
                        <span
                          className={clsx(
                            'font-bold',
                            pt.status === 'completed' ? 'line-through text-[#66545B]' : 'text-[#2A1D22]'
                          )}
                        >
                          {pt.title}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#66545B] font-bold">
                        {pt.completed_pomodoros || 0} 🍅 • {pt.estimated_minutes}m
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        ) : (
          /* Tomorrow Planning Tab */
          <Card className="space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-[#2A1D22]">
                Prior Planning for Tomorrow ({tomorrow})
              </h3>
              <p className="text-xs text-[#66545B]">
                Lock in your study tasks the night before to wake up ready with zero friction!
              </p>
            </div>

            <div className="p-4 rounded-[20px] bg-[#FFF3F5] border border-[#FFE4EB] space-y-2">
              <p className="text-xs font-bold text-[#C73A57]">
                Tomorrow&apos;s Planned Goals:
              </p>
              {(tomorrowDraft?.draft_tasks ?? []).length === 0 ? (
                <p className="text-xs text-[#66545B] italic">No draft tasks added yet for tomorrow.</p>
              ) : (
                <div className="space-y-1.5">
                  {(tomorrowDraft?.draft_tasks ?? []).map((dt: any) => (
                    <div
                      key={dt.id}
                      className="flex items-center justify-between bg-white p-2.5 rounded-[12px] border border-[#FAD7E0] text-xs font-bold"
                    >
                      <span>{dt.title}</span>
                      <span className="text-[10px] text-[#66545B]">{dt.estimated_minutes} mins</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Tomorrow task (e.g. Solve 20 Physics Numericals)…"
                value={newDraftTitle}
                onChange={(e) => setNewDraftTitle(e.target.value)}
                className="flex-1 bg-[#FFF3F5] text-sm font-medium rounded-[16px] px-4 py-2.5 border border-[#FAD7E0] outline-none"
              />
              <Button
                size="sm"
                onClick={async () => {
                  if (!newDraftTitle.trim()) return;
                  const currentTasks = (tomorrowDraft?.draft_tasks ?? []).map((t: any) => ({
                    title: t.title,
                    estimated_minutes: t.estimated_minutes,
                  }));
                  currentTasks.push({
                    title: newDraftTitle.trim(),
                    estimated_minutes: parseInt(newDraftMinutes, 10) || 30,
                  });
                  await plannerService.createDraft(tomorrow, currentTasks);
                  setNewDraftTitle('');
                  void queryClient.invalidateQueries({ queryKey: ['planner-draft', tomorrow] });
                }}
              >
                Add to Tomorrow
              </Button>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
