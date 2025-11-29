'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  User,
  Bell,
  Shield,
  Palette,
  Save,
  Camera,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAuthStore } from '@/stores/auth.store';
import { useSettingsStore, themes, Theme } from '@/stores/settings.store';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const {
    theme,
    compactMode,
    animations,
    glassOpacity,
    setTheme,
    setCompactMode,
    setAnimations,
    setGlassOpacity,
  } = useSettingsStore();

  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="w-8 h-8 text-cosmic-purple" />
            Settings
          </h1>
          <p className="text-gray-400 mt-1">Manage your account preferences</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass">
              <CardContent className="p-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                      activeTab === tab.id
                        ? 'bg-cosmic-purple/20 text-cosmic-purple'
                        : 'text-gray-400 hover:bg-glass-light hover:text-white'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3"
          >
            {activeTab === 'profile' && (
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Profile Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-cosmic-purple/30 flex items-center justify-center text-2xl font-bold">
                        {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                      </div>
                      <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-cosmic-purple flex items-center justify-center">
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                      <p className="text-sm text-gray-400">{user?.email}</p>
                    </div>
                  </div>

                  {/* Form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-gray-400">First Name</label>
                      <Input defaultValue={user?.firstName} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-400">Last Name</label>
                      <Input defaultValue={user?.lastName} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm text-gray-400">Email</label>
                      <Input defaultValue={user?.email} type="email" />
                    </div>
                  </div>

                  <Button className="bg-cosmic-purple hover:bg-cosmic-purple/80">
                    <Save className="mr-2 w-4 h-4" />
                    Save Changes
                  </Button>
                </CardContent>
              </Card>
            )}

            {activeTab === 'notifications' && (
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: 'Task Assignments', description: 'Get notified when tasks are assigned to you' },
                    { label: 'Task Completions', description: 'Get notified when your tasks are completed' },
                    { label: 'Achievement Unlocked', description: 'Get notified when you unlock achievements' },
                    { label: 'Team Updates', description: 'Get updates about your team activities' },
                    { label: 'Weekly Digest', description: 'Receive weekly summary emails' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-glass-light">
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-gray-400">{item.description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:ring-2 peer-focus:ring-cosmic-purple rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cosmic-purple"></div>
                      </label>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {activeTab === 'security' && (
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-medium">Change Password</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm text-gray-400">Current Password</label>
                        <Input type="password" placeholder="••••••••" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-gray-400">New Password</label>
                        <Input type="password" placeholder="••••••••" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-gray-400">Confirm New Password</label>
                        <Input type="password" placeholder="••••••••" />
                      </div>
                    </div>
                    <Button className="bg-cosmic-purple hover:bg-cosmic-purple/80">
                      Update Password
                    </Button>
                  </div>

                  <div className="border-t border-glass-border pt-6">
                    <h3 className="font-medium mb-4">Two-Factor Authentication</h3>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-glass-light">
                      <div>
                        <p className="font-medium">2FA Status</p>
                        <p className="text-sm text-gray-400">Add extra security to your account</p>
                      </div>
                      <Button variant="outline">Enable 2FA</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'appearance' && (
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Appearance Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Theme Selection */}
                  <div className="space-y-4">
                    <div>
                      <p className="font-medium mb-1">Theme</p>
                      <p className="text-sm text-gray-400 mb-4">Choose your preferred color theme</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {themes.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setTheme(t.id as Theme)}
                          className={cn(
                            'relative p-4 rounded-xl border-2 transition-all',
                            theme === t.id
                              ? 'border-cosmic-purple bg-cosmic-purple/10'
                              : 'border-glass-border hover:border-glass-medium bg-glass-light'
                          )}
                        >
                          {/* Theme preview colors */}
                          <div className="flex gap-2 mb-3">
                            <div
                              className="w-6 h-6 rounded-full"
                              style={{ backgroundColor: t.colors.primary }}
                            />
                            <div
                              className="w-6 h-6 rounded-full"
                              style={{ backgroundColor: t.colors.secondary }}
                            />
                            <div
                              className="w-6 h-6 rounded-full"
                              style={{ backgroundColor: t.colors.accent }}
                            />
                          </div>
                          <p className="text-sm font-medium text-left">{t.name}</p>
                          {theme === t.id && (
                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-cosmic-purple flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Glass Transparency Slider */}
                  <div className="p-4 rounded-xl bg-glass-light space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Glass Transparency</p>
                        <p className="text-sm text-gray-400">Adjust the liquid glass effect intensity</p>
                      </div>
                      <span className="text-sm font-medium text-cosmic-purple">{glassOpacity}%</span>
                    </div>
                    <div className="relative">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={glassOpacity}
                        onChange={(e) => setGlassOpacity(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider-thumb"
                        style={{
                          background: `linear-gradient(to right, #7c3aed ${glassOpacity}%, #4b5563 ${glassOpacity}%)`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Transparent</span>
                      <span>Opaque</span>
                    </div>
                  </div>

                  {/* Animations Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-glass-light">
                    <div>
                      <p className="font-medium">Animations</p>
                      <p className="text-sm text-gray-400">Enable or disable UI animations</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={animations}
                        onChange={(e) => setAnimations(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:ring-2 peer-focus:ring-cosmic-purple rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cosmic-purple"></div>
                    </label>
                  </div>

                  {/* Compact Mode Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-glass-light">
                    <div>
                      <p className="font-medium">Compact Mode</p>
                      <p className="text-sm text-gray-400">Reduce spacing and padding for denser layout</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={compactMode}
                        onChange={(e) => setCompactMode(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:ring-2 peer-focus:ring-cosmic-purple rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cosmic-purple"></div>
                    </label>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
