'use client';

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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

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

const insights = [
  { label: 'Productivity Score', value: 87, trend: '+5%', status: 'good' },
  { label: 'Task Completion Rate', value: 94, trend: '+2%', status: 'excellent' },
  { label: 'Average Response Time', value: 2.3, unit: 'hours', trend: '-15%', status: 'good' },
  { label: 'Collaboration Index', value: 78, trend: '+8%', status: 'improving' },
];

const anomalies = [
  { type: 'warning', message: 'Task "Database optimization" has been in progress for 5 days', time: '2 hours ago' },
  { type: 'info', message: 'Your productivity dropped 20% on Wednesdays. Consider reviewing your schedule.', time: '1 day ago' },
];

export default function AIInsightsPage() {
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
          <Button className="bg-cosmic-purple hover:bg-cosmic-purple/80">
            <Brain className="mr-2 w-4 h-4" />
            Refresh Analysis
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
                          animate={{ strokeDasharray: '306 352' }}
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
                        <span className="text-3xl font-bold">87</span>
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
                    className="flex gap-4 p-4 rounded-xl bg-glass-light"
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
                    className={`p-4 rounded-xl border-l-4 ${
                      anomaly.type === 'warning'
                        ? 'border-l-orange-500 bg-orange-500/10'
                        : 'border-l-cosmic-blue bg-cosmic-blue/10'
                    }`}
                  >
                    <p className="text-sm">{anomaly.message}</p>
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
                {[
                  { task: 'Complete API documentation', reason: 'Highest priority, due tomorrow', points: 50 },
                  { task: 'Review Jane\'s PR #423', reason: 'Blocking team progress', points: 20 },
                  { task: 'Update unit tests', reason: 'Coverage dropped below 80%', points: 30 },
                ].map((action, i) => (
                  <div key={i} className="p-4 rounded-xl bg-glass-light hover:bg-glass-medium transition cursor-pointer">
                    <p className="font-medium">{action.task}</p>
                    <p className="text-sm text-gray-400 mt-1">{action.reason}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-cosmic-purple font-medium">+{action.points} pts</span>
                      <Button size="sm" variant="ghost">Start</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
