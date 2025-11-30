'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Activity,
  Globe,
  Lock,
  Unlock,
  Ban,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Users,
  Eye,
  RefreshCw,
  Search,
  Plus,
  Trash2,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Loader2,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAuthStore } from '@/stores/auth.store';
import { securityApi } from '@/lib/api';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface SecurityDashboard {
  protectionLevel: number;
  activeThreats: number;
  blockedIps: number;
  lockedAccounts: number;
  captchaEnabled: boolean;
  globalCaptcha: boolean;
  trafficMetrics: {
    requestsPerMinute: number;
    errorRate: number;
    avgResponseTime: number;
    uniqueIps: number;
  };
  recentEvents: SecurityEvent[];
}

interface SecurityEvent {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  ip?: string;
  email?: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

interface BlockedIp {
  ip: string;
  reason: string;
  blockedAt: string;
  expiresAt?: string;
}

interface LockedAccount {
  email: string;
  failedAttempts: number;
  lockedAt: string;
  lockoutUntil: string;
}

// ============================================================================
// Protection Level Badges
// ============================================================================

const PROTECTION_LEVELS = [
  { level: 0, name: 'Normal', color: 'text-status-success', bg: 'bg-status-success/20', icon: ShieldCheck },
  { level: 1, name: 'Elevated', color: 'text-yellow-500', bg: 'bg-yellow-500/20', icon: Shield },
  { level: 2, name: 'High', color: 'text-orange-500', bg: 'bg-orange-500/20', icon: ShieldAlert },
  { level: 3, name: 'Critical', color: 'text-status-error', bg: 'bg-status-error/20', icon: ShieldAlert },
  { level: 4, name: 'Lockdown', color: 'text-red-600', bg: 'bg-red-600/20', icon: ShieldOff },
];

const SEVERITY_COLORS = {
  low: 'text-gray-400 bg-gray-400/20',
  medium: 'text-yellow-500 bg-yellow-500/20',
  high: 'text-orange-500 bg-orange-500/20',
  critical: 'text-status-error bg-status-error/20',
};

// ============================================================================
// Security Dashboard Page
// ============================================================================

export default function SecurityDashboardPage() {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'ips' | 'accounts'>('overview');

  // Dashboard data
  const [dashboard, setDashboard] = useState<SecurityDashboard | null>(null);
  const [blockedIps, setBlockedIps] = useState<BlockedIp[]>([]);
  const [lockedAccounts, setLockedAccounts] = useState<LockedAccount[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);

  // Modal states
  const [showBlockIpModal, setShowBlockIpModal] = useState(false);
  const [blockIpForm, setBlockIpForm] = useState({ ip: '', reason: '', duration: 3600 });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      const response = await securityApi.getDashboard();
      setDashboard(response.data.data);
      setEvents(response.data.data.recentEvents || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch security dashboard:', err);
      setError('Failed to load security dashboard');
      // Use mock data for development
      setDashboard({
        protectionLevel: 0,
        activeThreats: 3,
        blockedIps: 12,
        lockedAccounts: 2,
        captchaEnabled: true,
        globalCaptcha: false,
        trafficMetrics: {
          requestsPerMinute: 450,
          errorRate: 2.3,
          avgResponseTime: 120,
          uniqueIps: 89,
        },
        recentEvents: [
          {
            id: '1',
            type: 'BRUTE_FORCE_ATTEMPT',
            severity: 'high',
            message: 'Multiple failed login attempts detected',
            ip: '192.168.1.100',
            email: 'test@example.com',
            timestamp: new Date().toISOString(),
          },
          {
            id: '2',
            type: 'RATE_LIMIT_EXCEEDED',
            severity: 'medium',
            message: 'Rate limit exceeded for API endpoint',
            ip: '10.0.0.50',
            timestamp: new Date(Date.now() - 300000).toISOString(),
          },
          {
            id: '3',
            type: 'DIRECTORY_FUZZING',
            severity: 'high',
            message: 'Directory fuzzing attack detected',
            ip: '172.16.0.25',
            timestamp: new Date(Date.now() - 600000).toISOString(),
          },
        ],
      });
      setEvents([
        {
          id: '1',
          type: 'BRUTE_FORCE_ATTEMPT',
          severity: 'high',
          message: 'Multiple failed login attempts detected',
          ip: '192.168.1.100',
          email: 'test@example.com',
          timestamp: new Date().toISOString(),
        },
        {
          id: '2',
          type: 'RATE_LIMIT_EXCEEDED',
          severity: 'medium',
          message: 'Rate limit exceeded for API endpoint',
          ip: '10.0.0.50',
          timestamp: new Date(Date.now() - 300000).toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Fetch blocked IPs
  const fetchBlockedIps = useCallback(async () => {
    try {
      const response = await securityApi.getBlockedIps();
      setBlockedIps(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch blocked IPs:', err);
      // Mock data
      setBlockedIps([
        { ip: '192.168.1.100', reason: 'Brute force attack', blockedAt: new Date().toISOString() },
        { ip: '10.0.0.50', reason: 'Rate limit abuse', blockedAt: new Date(Date.now() - 3600000).toISOString(), expiresAt: new Date(Date.now() + 3600000).toISOString() },
      ]);
    }
  }, []);

  // Fetch locked accounts
  const fetchLockedAccounts = useCallback(async () => {
    try {
      const response = await securityApi.getLockedAccounts();
      setLockedAccounts(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch locked accounts:', err);
      // Mock data
      setLockedAccounts([
        { email: 'user1@example.com', failedAttempts: 5, lockedAt: new Date().toISOString(), lockoutUntil: new Date(Date.now() + 900000).toISOString() },
      ]);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    fetchBlockedIps();
    fetchLockedAccounts();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDashboard(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchDashboard, fetchBlockedIps, fetchLockedAccounts]);

  // Actions
  const handleSetProtectionLevel = async (level: number) => {
    setActionLoading(`protection-${level}`);
    try {
      await securityApi.setProtectionLevel(level);
      await fetchDashboard(true);
    } catch (err) {
      console.error('Failed to set protection level:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlockIp = async () => {
    if (!blockIpForm.ip) return;
    setActionLoading('block-ip');
    try {
      await securityApi.blockIp(blockIpForm.ip, blockIpForm.reason, blockIpForm.duration);
      setShowBlockIpModal(false);
      setBlockIpForm({ ip: '', reason: '', duration: 3600 });
      await fetchBlockedIps();
      await fetchDashboard(true);
    } catch (err) {
      console.error('Failed to block IP:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnblockIp = async (ip: string) => {
    setActionLoading(`unblock-${ip}`);
    try {
      await securityApi.unblockIp(ip);
      await fetchBlockedIps();
      await fetchDashboard(true);
    } catch (err) {
      console.error('Failed to unblock IP:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnlockAccount = async (email: string) => {
    setActionLoading(`unlock-${email}`);
    try {
      await securityApi.unlockAccount(email);
      await fetchLockedAccounts();
      await fetchDashboard(true);
    } catch (err) {
      console.error('Failed to unlock account:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleCaptcha = async () => {
    if (!dashboard) return;
    setActionLoading('captcha');
    try {
      await securityApi.setCaptchaMode(!dashboard.captchaEnabled);
      await fetchDashboard(true);
    } catch (err) {
      console.error('Failed to toggle CAPTCHA:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleGlobalCaptcha = async () => {
    if (!dashboard) return;
    setActionLoading('global-captcha');
    try {
      await securityApi.setCaptchaMode(dashboard.captchaEnabled, !dashboard.globalCaptcha);
      await fetchDashboard(true);
    } catch (err) {
      console.error('Failed to toggle global CAPTCHA:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  // Get protection level info
  const protectionInfo = PROTECTION_LEVELS[dashboard?.protectionLevel || 0];
  const ProtectionIcon = protectionInfo?.icon || Shield;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-cosmic-purple" />
        </div>
      </DashboardLayout>
    );
  }

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
              <Shield className="w-8 h-8 text-cosmic-purple" />
              Security Dashboard
            </h1>
            <p className="text-gray-400 mt-1">Monitor and manage application security</p>
          </div>
          <Button
            variant="outline"
            onClick={() => fetchDashboard(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 border-b border-glass-border pb-4"
        >
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'events', label: 'Security Events', icon: Activity },
            { id: 'ips', label: 'IP Management', icon: Globe },
            { id: 'accounts', label: 'Locked Accounts', icon: Users },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={activeTab === tab.id ? 'bg-cosmic-purple' : ''}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </Button>
          ))}
        </motion.div>

        {/* Overview Tab */}
        {activeTab === 'overview' && dashboard && (
          <>
            {/* Protection Level & Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
            >
              {/* Protection Level */}
              <Card className={cn('glass col-span-1 lg:col-span-2', protectionInfo.bg)}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center', protectionInfo.bg)}>
                      <ProtectionIcon className={cn('w-8 h-8', protectionInfo.color)} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Protection Level</p>
                      <p className={cn('text-2xl font-bold', protectionInfo.color)}>
                        {protectionInfo.name}
                      </p>
                      <p className="text-xs text-gray-500">Level {dashboard.protectionLevel}/4</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              {[
                { label: 'Active Threats', value: dashboard.activeThreats, icon: AlertTriangle, color: 'text-status-error' },
                { label: 'Blocked IPs', value: dashboard.blockedIps, icon: Ban, color: 'text-orange-500' },
                { label: 'Locked Accounts', value: dashboard.lockedAccounts, icon: Lock, color: 'text-yellow-500' },
              ].map((stat, i) => (
                <Card key={i} className="glass">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">{stat.label}</p>
                        <p className={cn('text-3xl font-bold', stat.color)}>{stat.value}</p>
                      </div>
                      <stat.icon className={cn('w-8 h-8', stat.color)} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>

            {/* Traffic Metrics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {[
                { label: 'Requests/min', value: dashboard.trafficMetrics.requestsPerMinute, icon: Activity, color: 'text-cosmic-purple', suffix: '' },
                { label: 'Error Rate', value: dashboard.trafficMetrics.errorRate, icon: XCircle, color: 'text-status-error', suffix: '%' },
                { label: 'Avg Response', value: dashboard.trafficMetrics.avgResponseTime, icon: Clock, color: 'text-cosmic-cyan', suffix: 'ms' },
                { label: 'Unique IPs', value: dashboard.trafficMetrics.uniqueIps, icon: Globe, color: 'text-yellow-500', suffix: '' },
              ].map((metric, i) => (
                <Card key={i} className="glass">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">{metric.label}</p>
                        <p className={cn('text-2xl font-bold', metric.color)}>
                          {metric.value}{metric.suffix}
                        </p>
                      </div>
                      <metric.icon className={cn('w-6 h-6', metric.color)} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>

            {/* Protection Level Controls & CAPTCHA */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Protection Level Control */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-cosmic-purple" />
                      Protection Level Control
                    </CardTitle>
                    <CardDescription>
                      Adjust security measures based on threat level
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {PROTECTION_LEVELS.map((level) => {
                        const LevelIcon = level.icon;
                        const isActive = dashboard.protectionLevel === level.level;
                        return (
                          <Button
                            key={level.level}
                            variant={isActive ? 'default' : 'outline'}
                            className={cn(
                              'flex-1 min-w-[100px]',
                              isActive && level.bg,
                              isActive && level.color
                            )}
                            onClick={() => handleSetProtectionLevel(level.level)}
                            disabled={actionLoading === `protection-${level.level}`}
                          >
                            {actionLoading === `protection-${level.level}` ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <LevelIcon className="w-4 h-4 mr-2" />
                            )}
                            {level.name}
                          </Button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* CAPTCHA Controls */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="w-5 h-5 text-cosmic-purple" />
                      CAPTCHA Settings
                    </CardTitle>
                    <CardDescription>
                      Control CAPTCHA verification requirements
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-glass-light">
                      <div>
                        <p className="font-medium">Enable CAPTCHA</p>
                        <p className="text-sm text-gray-400">Require verification after failed attempts</p>
                      </div>
                      <Button
                        variant={dashboard.captchaEnabled ? 'default' : 'outline'}
                        onClick={handleToggleCaptcha}
                        disabled={actionLoading === 'captcha'}
                      >
                        {actionLoading === 'captcha' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : dashboard.captchaEnabled ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Enabled
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 mr-2" />
                            Disabled
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-glass-light">
                      <div>
                        <p className="font-medium">Global CAPTCHA Mode</p>
                        <p className="text-sm text-gray-400">Require verification for all login attempts</p>
                      </div>
                      <Button
                        variant={dashboard.globalCaptcha ? 'default' : 'outline'}
                        onClick={handleToggleGlobalCaptcha}
                        disabled={actionLoading === 'global-captcha' || !dashboard.captchaEnabled}
                      >
                        {actionLoading === 'global-captcha' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : dashboard.globalCaptcha ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 mr-2" />
                            Inactive
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Recent Security Events */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="glass">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-cosmic-purple" />
                      Recent Security Events
                    </CardTitle>
                    <CardDescription>Latest security incidents and alerts</CardDescription>
                  </div>
                  <Button variant="ghost" onClick={() => setActiveTab('events')}>
                    View All
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {events.slice(0, 5).map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center gap-4 p-4 rounded-xl bg-glass-light"
                      >
                        <div className={cn('p-2 rounded-lg', SEVERITY_COLORS[event.severity])}>
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{event.message}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <span className="font-mono">{event.type}</span>
                            {event.ip && (
                              <>
                                <span>·</span>
                                <span>{event.ip}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-gray-400">
                          {formatTime(event.timestamp)}
                        </div>
                      </div>
                    ))}
                    {events.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <ShieldCheck className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No recent security events</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cosmic-purple" />
                  Security Events Log
                </CardTitle>
                <CardDescription>Complete history of security incidents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-4 p-4 rounded-xl bg-glass-light hover:bg-glass-medium transition"
                    >
                      <div className={cn('p-2 rounded-lg', SEVERITY_COLORS[event.severity])}>
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn('text-xs px-2 py-0.5 rounded-full', SEVERITY_COLORS[event.severity])}>
                            {event.severity.toUpperCase()}
                          </span>
                          <span className="font-mono text-xs text-gray-500">{event.type}</span>
                        </div>
                        <p className="font-medium">{event.message}</p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                          {event.ip && <span>IP: {event.ip}</span>}
                          {event.email && <span>Email: {event.email}</span>}
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-400">
                        <p>{formatTime(event.timestamp)}</p>
                        <p className="text-xs">{new Date(event.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                  {events.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <ShieldCheck className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">No security events recorded</p>
                      <p className="text-sm">All systems operating normally</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* IP Management Tab */}
        {activeTab === 'ips' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card className="glass">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Ban className="w-5 h-5 text-status-error" />
                    Blocked IP Addresses
                  </CardTitle>
                  <CardDescription>IPs blocked due to malicious activity</CardDescription>
                </div>
                <Button onClick={() => setShowBlockIpModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Block IP
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {blockedIps.map((item) => (
                    <div
                      key={item.ip}
                      className="flex items-center gap-4 p-4 rounded-xl bg-glass-light"
                    >
                      <div className="p-2 rounded-lg bg-status-error/20">
                        <Ban className="w-4 h-4 text-status-error" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-mono font-medium">{item.ip}</p>
                        <p className="text-sm text-gray-400">{item.reason}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <span>Blocked: {formatTime(item.blockedAt)}</span>
                          {item.expiresAt && (
                            <>
                              <span>·</span>
                              <span>Expires: {formatTime(item.expiresAt)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnblockIp(item.ip)}
                        disabled={actionLoading === `unblock-${item.ip}`}
                      >
                        {actionLoading === `unblock-${item.ip}` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Unlock className="w-4 h-4 mr-2" />
                            Unblock
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                  {blockedIps.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">No blocked IPs</p>
                      <p className="text-sm">All traffic is currently allowed</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Locked Accounts Tab */}
        {activeTab === 'accounts' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-yellow-500" />
                  Locked Accounts
                </CardTitle>
                <CardDescription>Accounts locked due to failed login attempts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lockedAccounts.map((account) => (
                    <div
                      key={account.email}
                      className="flex items-center gap-4 p-4 rounded-xl bg-glass-light"
                    >
                      <div className="p-2 rounded-lg bg-yellow-500/20">
                        <Lock className="w-4 h-4 text-yellow-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{account.email}</p>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                          <span>Failed attempts: {account.failedAttempts}</span>
                          <span>·</span>
                          <span>Locked: {formatTime(account.lockedAt)}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Auto-unlocks: {new Date(account.lockoutUntil).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnlockAccount(account.email)}
                        disabled={actionLoading === `unlock-${account.email}`}
                      >
                        {actionLoading === `unlock-${account.email}` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Unlock className="w-4 h-4 mr-2" />
                            Unlock
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                  {lockedAccounts.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">No locked accounts</p>
                      <p className="text-sm">All user accounts are accessible</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Block IP Modal */}
      <AnimatePresence>
        {showBlockIpModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowBlockIpModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md rounded-2xl border border-glass-border bg-cosmic-dark p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Ban className="w-5 h-5 text-status-error" />
                  Block IP Address
                </h2>
                <button
                  onClick={() => setShowBlockIpModal(false)}
                  className="p-2 rounded-lg hover:bg-glass-light transition"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">IP Address</label>
                  <Input
                    placeholder="192.168.1.100"
                    value={blockIpForm.ip}
                    onChange={(e) => setBlockIpForm({ ...blockIpForm, ip: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Reason</label>
                  <Input
                    placeholder="Reason for blocking"
                    value={blockIpForm.reason}
                    onChange={(e) => setBlockIpForm({ ...blockIpForm, reason: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Duration (seconds)</label>
                  <Input
                    type="number"
                    placeholder="3600"
                    value={blockIpForm.duration}
                    onChange={(e) => setBlockIpForm({ ...blockIpForm, duration: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-gray-500">Set to 0 for permanent block</p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowBlockIpModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-status-error hover:bg-status-error/80"
                  onClick={handleBlockIp}
                  disabled={!blockIpForm.ip || actionLoading === 'block-ip'}
                >
                  {actionLoading === 'block-ip' ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Ban className="w-4 h-4 mr-2" />
                  )}
                  Block IP
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
