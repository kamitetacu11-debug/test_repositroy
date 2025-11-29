'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Brain,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Target,
  Clock,
  Zap,
  RefreshCw,
  Play,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

const recommendations = [
  {
    title: 'Focus on High-Priority Tasks',
    description: 'You have 3 critical tasks due this week. Consider prioritizing these first.',
    icon: Target,
    color: 'text-status-error',
    bgColor: 'bg-status-error/20',
  },
  {
    title: 'Optimal Work Hours',
    description: 'Your productivity peaks between 9 AM - 12 PM. Schedule complex tasks during this window.',
    icon: Clock,
    color: 'text-cosmic-cyan',
    bgColor: 'bg-cosmic-cyan/20',
  },
  {
    title: 'Streak at Risk',
    description: 'Complete at least one task today to maintain your 15-day streak!',
    icon: Zap,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/20',
  },
];

const initialInsights = [
  { label: 'Productivity Score', value: 87, trend: '+5%', status: 'good' },
  { label: 'Task Completion Rate', value: 94, trend: '+2%', status: 'excellent' },
  { label: 'Average Response Time', value: 2.3, unit: 'hours', trend: '-15%', status: 'good' },
  { label: 'Collaboration Index', value: 78, trend: '+8%', status: 'improving' },
];

const anomalies = [
  { type: 'warning', message: 'Task "Database optimization" has been in progress for 5 days', time: '2 hours ago', taskId: '6' },
  { type: 'info', message: 'Your productivity dropped 20% on Wednesdays. Consider reviewing your schedule.', time: '1 day ago' },
];

const suggestedActions = [
  { id: '1', task: 'Complete API documentation', reason: 'Highest priority, due tomorrow', points: 50, priority: 'CRITICAL' },
  { id: '2', task: 'Review Jane\'s PR #423', reason: 'Blocking team progress', points: 20, priority: 'HIGH' },
  { id: '3', task: 'Update unit tests', reason: 'Coverage dropped below 80%', points: 30, priority: 'MEDIUM' },
];

export default function AIInsightsPage() {
  const { addToast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [insights, setInsights] = useState(initialInsights);
  const [startedTasks, setStartedTasks] = useState<string[]>([]);
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<typeof suggestedActions[0] | null>(null);
  const [showAnomalyModal, setShowAnomalyModal] = useState(false);
  const [selectedAnomaly, setSelectedAnomaly] = useState<typeof anomalies[0] | null>(null);

  const handleRefreshAnalysis = async () => {
    setIsRefreshing(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Update insights with slightly different values
    setInsights(prev => prev.map(insight => ({
      ...insight,
      value: typeof insight.value === 'number'
        ? Math.round(insight.value + (Math.random() - 0.5) * 5)
        : insight.value,
    })));

    setIsRefreshing(false);
    addToast({
      type: 'success',
      title: 'Analysis Updated',
      message: 'AI insights have been refreshed with latest data.',
    });
  };

  const handleStartTask = (action: typeof suggestedActions[0]) => {
    setSelectedAction(action);
    setShowStartModal(true);
  };

  const confirmStartTask = () => {
    if (selectedAction) {
      setStartedTasks(prev => [...prev, selectedAction.id]);
      setShowStartModal(false);
      addToast({
        type: 'success',
        title: 'Task Started',
        message: `"${selectedAction.task}" has been added to your active tasks.`,
      });
    }
  };

  const handleAnomalyClick = (anomaly: typeof anomalies[0]) => {
    setSelectedAnomaly(anomaly);
    setShowAnomalyModal(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-cosmic-purple" />
              AI Insights
            </h1>
            <p className="text-gray-400 mt-1">Personalized recommendations powered by AI</p>
          </div>
          <Button
            className="bg-cosmic-purple hover:bg-cosmic-purple/80"
            onClick={handleRefreshAnalysis}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <RefreshCw className="mr-2 w-4 h-4 animate-spin" />
            ) : (
              <Brain className="mr-2 w-4 h-4" />
            )}
            {isRefreshing ? 'Analyzing...' : 'Refresh Analysis'}
          </Button>
        </motion.div>

        {/* AI Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass overflow-hidden">
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row items-center">
                <div className="flex-1 p-6">
                  <h2 className="text-xl font-semibold mb-2">Your Productivity Score</h2>
                  <p className="text-gray-400 mb-4">Based on your activity over the last 30 days</p>
                  <div className="flex items-center gap-4">
                    <div className="relative w-32 h-32">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="currentColor"
                          strokeWidth="12"
                          fill="none"
                          className="text-glass-light"
                        />
                        <motion.circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="url(#gradient)"
                          strokeWidth="12"
                          fill="none"
                          strokeLinecap="round"
                          initial={{ strokeDasharray: '0 352' }}
                          animate={{ strokeDasharray: `${(insights[0].value / 100) * 352} 352` }}
                          transition={{ duration: 1, delay: 0.5 }}
                        />
                        <defs>
                          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#7c3aed" />
                            <stop offset="100%" stopColor="#06b6d4" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-bold">{insights[0].value}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-status-success font-medium flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        +5% from last month
                      </p>
                      <p className="text-gray-400 text-sm mt-1">Top 15% in your team</p>
                    </div>
                  </div>
                </div>
                <div className="w-full md:w-px h-px md:h-32 bg-glass-border" />
                <div className="flex-1 p-6 grid grid-cols-2 gap-4">
                  {insights.map((insight, i) => (
                    <div key={i}>
                      <p className="text-gray-400 text-sm">{insight.label}</p>
                      <p className="text-xl font-bold">
                        {insight.value}{insight.unit && <span className="text-sm text-gray-400 ml-1">{insight.unit}</span>}
                      </p>
                      <p className={`text-sm ${insight.trend.startsWith('+') ? 'text-status-success' : 'text-cosmic-cyan'}`}>
                        {insight.trend}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recommendations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="glass h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recommendations.map((rec, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex gap-4 p-4 rounded-xl bg-glass-light hover:bg-glass-medium transition cursor-pointer"
                  >
                    <div className={`w-10 h-10 rounded-xl ${rec.bgColor} flex items-center justify-center flex-shrink-0`}>
                      <rec.icon className={`w-5 h-5 ${rec.color}`} />
                    </div>
                    <div>
                      <p className="font-medium">{rec.title}</p>
                      <p className="text-sm text-gray-400 mt-1">{rec.description}</p>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Anomaly Detection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="glass h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Anomaly Detection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {anomalies.map((anomaly, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className={`p-4 rounded-xl border-l-4 cursor-pointer hover:opacity-80 transition ${
                      anomaly.type === 'warning'
                        ? 'border-l-orange-500 bg-orange-500/10'
                        : 'border-l-cosmic-blue bg-cosmic-blue/10'
                    }`}
                    onClick={() => handleAnomalyClick(anomaly)}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm">{anomaly.message}</p>
                      <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{anomaly.time}</p>
                  </motion.div>
                ))}

                <div className="p-4 rounded-xl bg-status-success/10 border border-status-success/30">
                  <p className="text-status-success text-sm font-medium">No critical anomalies detected</p>
                  <p className="text-xs text-gray-400 mt-1">Your workflow is running smoothly</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Next Best Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass">
            <CardHeader>
              <CardTitle>Suggested Next Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {suggestedActions.map((action) => {
                  const isStarted = startedTasks.includes(action.id);
                  return (
                    <div
                      key={action.id}
                      className={`p-4 rounded-xl transition ${
                        isStarted
                          ? 'bg-status-success/10 border border-status-success/30'
                          : 'bg-glass-light hover:bg-glass-medium'
                      }`}
                    >
                      <p className="font-medium">{action.task}</p>
                      <p className="text-sm text-gray-400 mt-1">{action.reason}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-cosmic-purple font-medium">+{action.points} pts</span>
                        {isStarted ? (
                          <span className="flex items-center gap-1 text-status-success text-sm">
                            <CheckCircle2 className="w-4 h-4" />
                            Started
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartTask(action)}
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Start
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Start Task Modal */}
      <Modal
        isOpen={showStartModal}
        onClose={() => setShowStartModal(false)}
        title="Start Task"
        size="sm"
      >
        {selectedAction && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-glass-light">
              <p className="font-medium text-lg">{selectedAction.task}</p>
              <p className="text-sm text-gray-400 mt-1">{selectedAction.reason}</p>
              <div className="flex items-center gap-4 mt-3">
                <span className="text-cosmic-purple font-medium">+{selectedAction.points} pts</span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  selectedAction.priority === 'CRITICAL' ? 'bg-status-error/20 text-status-error' :
                  selectedAction.priority === 'HIGH' ? 'bg-orange-500/20 text-orange-500' :
                  'bg-cosmic-blue/20 text-cosmic-blue'
                }`}>
                  {selectedAction.priority}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-400">
              This task will be added to your active tasks list. You can track your progress from the Tasks page.
            </p>
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowStartModal(false)}>
            Cancel
          </Button>
          <Button onClick={confirmStartTask}>
            <Play className="w-4 h-4 mr-2" />
            Start Working
          </Button>
        </ModalFooter>
      </Modal>

      {/* Anomaly Detail Modal */}
      <Modal
        isOpen={showAnomalyModal}
        onClose={() => setShowAnomalyModal(false)}
        title="Anomaly Details"
        size="md"
      >
        {selectedAnomaly && (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border-l-4 ${
              selectedAnomaly.type === 'warning'
                ? 'border-l-orange-500 bg-orange-500/10'
                : 'border-l-cosmic-blue bg-cosmic-blue/10'
            }`}>
              <p className="font-medium">{selectedAnomaly.message}</p>
              <p className="text-xs text-gray-400 mt-2">Detected: {selectedAnomaly.time}</p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-300">AI Recommendations:</p>
              <ul className="space-y-2 text-sm text-gray-400">
                {selectedAnomaly.type === 'warning' ? (
                  <>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-cosmic-purple" />
                      Review the task and check for blockers
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-cosmic-purple" />
                      Consider breaking it into smaller subtasks
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-cosmic-purple" />
                      Reassign if needed to meet deadlines
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-cosmic-purple" />
                      Review your Wednesday schedule
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-cosmic-purple" />
                      Consider scheduling lighter tasks for that day
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-cosmic-purple" />
                      Check for recurring meetings that may be disrupting focus
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowAnomalyModal(false)}>
            Close
          </Button>
          {selectedAnomaly?.taskId && (
            <Button onClick={() => {
              setShowAnomalyModal(false);
              addToast({
                type: 'info',
                title: 'Opening Task',
                message: 'Redirecting to task details...',
              });
            }}>
              View Task
            </Button>
          )}
        </ModalFooter>
      </Modal>
    </DashboardLayout>
  );
}
