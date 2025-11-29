'use client';

import { useState, useRef } from 'react';
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
  Star,
  Globe,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAuthStore } from '@/stores/auth.store';
import { useSettingsStore, themes, Theme, languages, Language } from '@/stores/settings.store';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

export default function SettingsPage() {
  const { user, updateAvatar } = useAuthStore();
  const {
    theme,
    language,
    compactMode,
    animations,
    glassOpacity,
    starBrightness,
    setTheme,
    setLanguage,
    setCompactMode,
    setAnimations,
    setGlassOpacity,
    setStarBrightness,
  } = useSettingsStore();
  const t = useTranslation();

  const [activeTab, setActiveTab] = useState('profile');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const avatarData = e.target?.result as string;
        await updateAvatar(avatarData);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const tabs = [
    { id: 'profile', label: t.settings.tabs.profile, icon: User },
    { id: 'notifications', label: t.settings.tabs.notifications, icon: Bell },
    { id: 'security', label: t.settings.tabs.security, icon: Shield },
    { id: 'appearance', label: t.settings.tabs.appearance, icon: Palette },
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
            {t.settings.title}
          </h1>
          <p className="text-gray-400 mt-1">{t.settings.subtitle}</p>
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
                  <CardTitle>{t.settings.profile.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <div
                        className="w-20 h-20 rounded-full bg-cosmic-purple/30 flex items-center justify-center text-2xl font-bold overflow-hidden cursor-pointer"
                        onClick={triggerFileUpload}
                      >
                        {isUploading ? (
                          <div className="animate-spin w-6 h-6 border-3 border-t-transparent rounded-full border-white" />
                        ) : user?.avatar ? (
                          <img
                            src={user.avatar}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</span>
                        )}
                      </div>
                      <button
                        className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-cosmic-purple flex items-center justify-center hover:bg-cosmic-purple/80 transition"
                        onClick={triggerFileUpload}
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                      <p className="text-sm text-gray-400">{user?.email}</p>
                      <button
                        className="text-sm text-cosmic-purple hover:text-cosmic-purple/80 mt-1"
                        onClick={triggerFileUpload}
                      >
                        {t.profilePage.change || 'Change photo'}
                      </button>
                    </div>
                  </div>

                  {/* Form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-gray-400">{t.settings.profile.firstName}</label>
                      <Input defaultValue={user?.firstName} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-400">{t.settings.profile.lastName}</label>
                      <Input defaultValue={user?.lastName} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm text-gray-400">{t.settings.profile.email}</label>
                      <Input defaultValue={user?.email} type="email" />
                    </div>
                  </div>

                  <Button className="bg-cosmic-purple hover:bg-cosmic-purple/80">
                    <Save className="mr-2 w-4 h-4" />
                    {t.settings.profile.saveChanges}
                  </Button>
                </CardContent>
              </Card>
            )}

            {activeTab === 'notifications' && (
              <Card className="glass">
                <CardHeader>
                  <CardTitle>{t.settings.notifications.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: t.settings.notifications.taskAssignments, description: t.settings.notifications.taskAssignmentsDesc },
                    { label: t.settings.notifications.taskCompletions, description: t.settings.notifications.taskCompletionsDesc },
                    { label: t.settings.notifications.achievementUnlocked, description: t.settings.notifications.achievementUnlockedDesc },
                    { label: t.settings.notifications.teamUpdates, description: t.settings.notifications.teamUpdatesDesc },
                    { label: t.settings.notifications.weeklyDigest, description: t.settings.notifications.weeklyDigestDesc },
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
                  <CardTitle>{t.settings.security.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-medium">{t.settings.security.changePassword}</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm text-gray-400">{t.settings.security.currentPassword}</label>
                        <Input type="password" placeholder="••••••••" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-gray-400">{t.settings.security.newPassword}</label>
                        <Input type="password" placeholder="••••••••" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-gray-400">{t.settings.security.confirmPassword}</label>
                        <Input type="password" placeholder="••••••••" />
                      </div>
                    </div>
                    <Button className="bg-cosmic-purple hover:bg-cosmic-purple/80">
                      {t.settings.security.updatePassword}
                    </Button>
                  </div>

                  <div className="border-t border-glass-border pt-6">
                    <h3 className="font-medium mb-4">{t.settings.security.twoFactor}</h3>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-glass-light">
                      <div>
                        <p className="font-medium">{t.settings.security.twoFactorStatus}</p>
                        <p className="text-sm text-gray-400">{t.settings.security.twoFactorDesc}</p>
                      </div>
                      <Button variant="outline">{t.settings.security.enable2fa}</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'appearance' && (
              <Card className="glass">
                <CardHeader>
                  <CardTitle>{t.settings.appearance.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Theme Selection */}
                  <div className="space-y-4">
                    <div>
                      <p className="font-medium mb-1">{t.settings.appearance.theme}</p>
                      <p className="text-sm text-gray-400 mb-4">{t.settings.appearance.themeDesc}</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {themes.map((themeItem) => (
                        <button
                          key={themeItem.id}
                          onClick={() => setTheme(themeItem.id as Theme)}
                          className={cn(
                            'relative p-4 rounded-xl border-2 transition-all',
                            theme === themeItem.id
                              ? 'border-cosmic-purple bg-cosmic-purple/10'
                              : 'border-glass-border hover:border-glass-medium bg-glass-light'
                          )}
                        >
                          {/* Theme preview colors */}
                          <div className="flex gap-2 mb-3">
                            <div
                              className="w-6 h-6 rounded-full"
                              style={{ backgroundColor: themeItem.colors.primary }}
                            />
                            <div
                              className="w-6 h-6 rounded-full"
                              style={{ backgroundColor: themeItem.colors.secondary }}
                            />
                            <div
                              className="w-6 h-6 rounded-full"
                              style={{ backgroundColor: themeItem.colors.accent }}
                            />
                          </div>
                          <p className="text-sm font-medium text-left">{themeItem.name}</p>
                          {theme === themeItem.id && (
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
                        <p className="font-medium">{t.settings.appearance.glassTransparency}</p>
                        <p className="text-sm text-gray-400">{t.settings.appearance.glassTransparencyDesc}</p>
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
                      <span>{t.settings.appearance.transparent}</span>
                      <span>{t.settings.appearance.opaque}</span>
                    </div>
                  </div>

                  {/* Star Brightness Slider */}
                  <div className="p-4 rounded-xl bg-glass-light space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-400" />
                        <div>
                          <p className="font-medium">{t.settings.appearance.starBrightness}</p>
                          <p className="text-sm text-gray-400">{t.settings.appearance.starBrightnessDesc}</p>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-cosmic-purple">{starBrightness}%</span>
                    </div>
                    <div className="relative">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={starBrightness}
                        onChange={(e) => setStarBrightness(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider-thumb"
                        style={{
                          background: `linear-gradient(to right, #eab308 ${starBrightness}%, #4b5563 ${starBrightness}%)`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{t.settings.appearance.hidden}</span>
                      <span>{t.settings.appearance.bright}</span>
                    </div>
                  </div>

                  {/* Language Selection */}
                  <div className="p-4 rounded-xl bg-glass-light space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Globe className="w-5 h-5 text-cosmic-cyan" />
                      <div>
                        <p className="font-medium">{t.settings.appearance.language}</p>
                        <p className="text-sm text-gray-400">{t.settings.appearance.languageDesc}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {languages.map((lang) => (
                        <button
                          key={lang.id}
                          onClick={() => setLanguage(lang.id as Language)}
                          className={cn(
                            'relative p-3 rounded-xl border-2 transition-all text-center',
                            language === lang.id
                              ? 'border-cosmic-purple bg-cosmic-purple/10'
                              : 'border-glass-border hover:border-glass-medium bg-glass-medium/50'
                          )}
                        >
                          <span className="text-2xl mb-1 block">{lang.flag}</span>
                          <p className="text-sm font-medium">{lang.nativeName}</p>
                          {language === lang.id && (
                            <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-cosmic-purple flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Animations Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-glass-light">
                    <div>
                      <p className="font-medium">{t.settings.appearance.animations}</p>
                      <p className="text-sm text-gray-400">{t.settings.appearance.animationsDesc}</p>
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
                      <p className="font-medium">{t.settings.appearance.compactMode}</p>
                      <p className="text-sm text-gray-400">{t.settings.appearance.compactModeDesc}</p>
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
