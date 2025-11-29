import { Language } from '@/stores/settings.store';

export const translations = {
  en: {
    // Navigation
    nav: {
      dashboard: 'Dashboard',
      tasks: 'Tasks',
      teams: 'Teams',
      leaderboard: 'Leaderboard',
      analytics: 'Analytics',
      aiInsights: 'AI Insights',
      settings: 'Settings',
      profile: 'Profile',
      notifications: 'Notifications',
      logout: 'Logout',
    },

    // Common
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      create: 'Create',
      search: 'Search',
      filter: 'Filter',
      loading: 'Loading...',
      noResults: 'No results found',
      viewAll: 'View all',
      markAllRead: 'Mark all read',
      level: 'Lvl',
    },

    // Settings page
    settings: {
      title: 'Settings',
      subtitle: 'Manage your account preferences',

      // Tabs
      tabs: {
        profile: 'Profile',
        notifications: 'Notifications',
        security: 'Security',
        appearance: 'Appearance',
      },

      // Profile section
      profile: {
        title: 'Profile Settings',
        firstName: 'First Name',
        lastName: 'Last Name',
        email: 'Email',
        saveChanges: 'Save Changes',
      },

      // Notifications section
      notifications: {
        title: 'Notification Preferences',
        taskAssignments: 'Task Assignments',
        taskAssignmentsDesc: 'Get notified when tasks are assigned to you',
        taskCompletions: 'Task Completions',
        taskCompletionsDesc: 'Get notified when your tasks are completed',
        achievementUnlocked: 'Achievement Unlocked',
        achievementUnlockedDesc: 'Get notified when you unlock achievements',
        teamUpdates: 'Team Updates',
        teamUpdatesDesc: 'Get updates about your team activities',
        weeklyDigest: 'Weekly Digest',
        weeklyDigestDesc: 'Receive weekly summary emails',
      },

      // Security section
      security: {
        title: 'Security Settings',
        changePassword: 'Change Password',
        currentPassword: 'Current Password',
        newPassword: 'New Password',
        confirmPassword: 'Confirm New Password',
        updatePassword: 'Update Password',
        twoFactor: 'Two-Factor Authentication',
        twoFactorStatus: '2FA Status',
        twoFactorDesc: 'Add extra security to your account',
        enable2fa: 'Enable 2FA',
      },

      // Appearance section
      appearance: {
        title: 'Appearance Settings',
        theme: 'Theme',
        themeDesc: 'Choose your preferred color theme',
        glassTransparency: 'Glass Transparency',
        glassTransparencyDesc: 'Adjust the liquid glass effect intensity',
        transparent: 'Transparent',
        opaque: 'Opaque',
        starBrightness: 'Star Brightness',
        starBrightnessDesc: 'Adjust the twinkling stars visibility',
        hidden: 'Hidden',
        bright: 'Bright',
        language: 'Language',
        languageDesc: 'Select your preferred language',
        animations: 'Animations',
        animationsDesc: 'Enable or disable UI animations',
        compactMode: 'Compact Mode',
        compactModeDesc: 'Reduce spacing and padding for denser layout',
      },
    },

    // Dashboard
    dashboard: {
      welcome: 'Welcome back',
      todayProgress: "Today's Progress",
      activeProjects: 'Active Projects',
      teamMembers: 'Team Members',
      totalPoints: 'Total Points',
      recentTasks: 'Recent Tasks',
      teamActivity: 'Team Activity',
      upcomingDeadlines: 'Upcoming Deadlines',
    },

    // Tasks
    tasks: {
      title: 'Tasks',
      subtitle: 'Manage and track your tasks',
      newTask: 'New Task',
      allTasks: 'All Tasks',
      myTasks: 'My Tasks',
      completed: 'Completed',
      inProgress: 'In Progress',
      pending: 'Pending',
      priority: 'Priority',
      dueDate: 'Due Date',
      assignee: 'Assignee',
      noTasks: 'No tasks found',
    },

    // Teams
    teams: {
      title: 'Teams',
      subtitle: 'Collaborate with your teams',
      createTeam: 'Create Team',
      members: 'Members',
      projects: 'Projects',
      joinTeam: 'Join Team',
    },

    // Leaderboard
    leaderboard: {
      title: 'Leaderboard',
      subtitle: 'See how you rank against others',
      rank: 'Rank',
      player: 'Player',
      points: 'Points',
      tasksCompleted: 'Tasks Completed',
      streak: 'Streak',
    },

    // Analytics
    analytics: {
      title: 'Analytics',
      subtitle: 'Track your productivity metrics',
      overview: 'Overview',
      productivity: 'Productivity',
      taskCompletion: 'Task Completion',
      timeSpent: 'Time Spent',
    },

    // AI Insights
    ai: {
      title: 'AI Insights',
      subtitle: 'Get intelligent recommendations',
      suggestions: 'Suggestions',
      analysis: 'Analysis',
    },

    // Notifications
    notificationsPage: {
      title: 'Notifications',
      noNotifications: 'No notifications',
      allCaughtUp: "You're all caught up!",
      viewAllNotifications: 'View all notifications',
      taskCompleted: 'Task Completed',
      newComment: 'New Comment',
      achievementUnlocked: 'Achievement Unlocked!',
      pointsEarned: 'Points Earned',
      teamUpdate: 'Team Update',
    },

    // Profile
    profilePage: {
      title: 'Profile',
      achievements: 'Achievements',
      stats: 'Statistics',
      activity: 'Recent Activity',
    },
  },

  ru: {
    // Navigation
    nav: {
      dashboard: 'Главная',
      tasks: 'Задачи',
      teams: 'Команды',
      leaderboard: 'Рейтинг',
      analytics: 'Аналитика',
      aiInsights: 'ИИ Советы',
      settings: 'Настройки',
      profile: 'Профиль',
      notifications: 'Уведомления',
      logout: 'Выйти',
    },

    // Common
    common: {
      save: 'Сохранить',
      cancel: 'Отмена',
      delete: 'Удалить',
      edit: 'Редактировать',
      create: 'Создать',
      search: 'Поиск',
      filter: 'Фильтр',
      loading: 'Загрузка...',
      noResults: 'Ничего не найдено',
      viewAll: 'Показать все',
      markAllRead: 'Прочитать все',
      level: 'Ур',
    },

    // Settings page
    settings: {
      title: 'Настройки',
      subtitle: 'Управление настройками аккаунта',

      // Tabs
      tabs: {
        profile: 'Профиль',
        notifications: 'Уведомления',
        security: 'Безопасность',
        appearance: 'Внешний вид',
      },

      // Profile section
      profile: {
        title: 'Настройки профиля',
        firstName: 'Имя',
        lastName: 'Фамилия',
        email: 'Email',
        saveChanges: 'Сохранить изменения',
      },

      // Notifications section
      notifications: {
        title: 'Настройки уведомлений',
        taskAssignments: 'Назначение задач',
        taskAssignmentsDesc: 'Уведомлять о назначенных задачах',
        taskCompletions: 'Завершение задач',
        taskCompletionsDesc: 'Уведомлять о завершённых задачах',
        achievementUnlocked: 'Достижения',
        achievementUnlockedDesc: 'Уведомлять о полученных достижениях',
        teamUpdates: 'Обновления команды',
        teamUpdatesDesc: 'Получать уведомления о командной активности',
        weeklyDigest: 'Еженедельный отчёт',
        weeklyDigestDesc: 'Получать еженедельные сводки на почту',
      },

      // Security section
      security: {
        title: 'Настройки безопасности',
        changePassword: 'Изменить пароль',
        currentPassword: 'Текущий пароль',
        newPassword: 'Новый пароль',
        confirmPassword: 'Подтвердите новый пароль',
        updatePassword: 'Обновить пароль',
        twoFactor: 'Двухфакторная аутентификация',
        twoFactorStatus: 'Статус 2FA',
        twoFactorDesc: 'Добавьте дополнительную защиту аккаунта',
        enable2fa: 'Включить 2FA',
      },

      // Appearance section
      appearance: {
        title: 'Настройки внешнего вида',
        theme: 'Тема',
        themeDesc: 'Выберите предпочитаемую цветовую тему',
        glassTransparency: 'Прозрачность стекла',
        glassTransparencyDesc: 'Настройте интенсивность стеклянного эффекта',
        transparent: 'Прозрачно',
        opaque: 'Непрозрачно',
        starBrightness: 'Яркость звёзд',
        starBrightnessDesc: 'Настройте видимость мерцающих звёзд',
        hidden: 'Скрыто',
        bright: 'Ярко',
        language: 'Язык',
        languageDesc: 'Выберите предпочитаемый язык',
        animations: 'Анимации',
        animationsDesc: 'Включить или отключить анимации интерфейса',
        compactMode: 'Компактный режим',
        compactModeDesc: 'Уменьшить отступы для компактного отображения',
      },
    },

    // Dashboard
    dashboard: {
      welcome: 'С возвращением',
      todayProgress: 'Прогресс за сегодня',
      activeProjects: 'Активные проекты',
      teamMembers: 'Участники команды',
      totalPoints: 'Всего очков',
      recentTasks: 'Недавние задачи',
      teamActivity: 'Активность команды',
      upcomingDeadlines: 'Ближайшие дедлайны',
    },

    // Tasks
    tasks: {
      title: 'Задачи',
      subtitle: 'Управление и отслеживание задач',
      newTask: 'Новая задача',
      allTasks: 'Все задачи',
      myTasks: 'Мои задачи',
      completed: 'Завершено',
      inProgress: 'В процессе',
      pending: 'Ожидает',
      priority: 'Приоритет',
      dueDate: 'Срок',
      assignee: 'Исполнитель',
      noTasks: 'Задачи не найдены',
    },

    // Teams
    teams: {
      title: 'Команды',
      subtitle: 'Совместная работа с командами',
      createTeam: 'Создать команду',
      members: 'Участники',
      projects: 'Проекты',
      joinTeam: 'Присоединиться',
    },

    // Leaderboard
    leaderboard: {
      title: 'Рейтинг',
      subtitle: 'Сравните свои результаты с другими',
      rank: 'Место',
      player: 'Игрок',
      points: 'Очки',
      tasksCompleted: 'Задач выполнено',
      streak: 'Серия',
    },

    // Analytics
    analytics: {
      title: 'Аналитика',
      subtitle: 'Отслеживайте метрики продуктивности',
      overview: 'Обзор',
      productivity: 'Продуктивность',
      taskCompletion: 'Выполнение задач',
      timeSpent: 'Затраченное время',
    },

    // AI Insights
    ai: {
      title: 'ИИ Советы',
      subtitle: 'Получайте умные рекомендации',
      suggestions: 'Предложения',
      analysis: 'Анализ',
    },

    // Notifications
    notificationsPage: {
      title: 'Уведомления',
      noNotifications: 'Нет уведомлений',
      allCaughtUp: 'Вы всё прочитали!',
      viewAllNotifications: 'Все уведомления',
      taskCompleted: 'Задача завершена',
      newComment: 'Новый комментарий',
      achievementUnlocked: 'Достижение получено!',
      pointsEarned: 'Очки начислены',
      teamUpdate: 'Обновление команды',
    },

    // Profile
    profilePage: {
      title: 'Профиль',
      achievements: 'Достижения',
      stats: 'Статистика',
      activity: 'Недавняя активность',
    },
  },

  zh: {
    // Navigation
    nav: {
      dashboard: '仪表板',
      tasks: '任务',
      teams: '团队',
      leaderboard: '排行榜',
      analytics: '分析',
      aiInsights: 'AI洞察',
      settings: '设置',
      profile: '个人资料',
      notifications: '通知',
      logout: '退出',
    },

    // Common
    common: {
      save: '保存',
      cancel: '取消',
      delete: '删除',
      edit: '编辑',
      create: '创建',
      search: '搜索',
      filter: '筛选',
      loading: '加载中...',
      noResults: '未找到结果',
      viewAll: '查看全部',
      markAllRead: '全部标记已读',
      level: '级',
    },

    // Settings page
    settings: {
      title: '设置',
      subtitle: '管理您的账户偏好',

      // Tabs
      tabs: {
        profile: '个人资料',
        notifications: '通知',
        security: '安全',
        appearance: '外观',
      },

      // Profile section
      profile: {
        title: '个人资料设置',
        firstName: '名',
        lastName: '姓',
        email: '邮箱',
        saveChanges: '保存更改',
      },

      // Notifications section
      notifications: {
        title: '通知设置',
        taskAssignments: '任务分配',
        taskAssignmentsDesc: '当任务分配给您时收到通知',
        taskCompletions: '任务完成',
        taskCompletionsDesc: '当您的任务完成时收到通知',
        achievementUnlocked: '成就解锁',
        achievementUnlockedDesc: '当您解锁成就时收到通知',
        teamUpdates: '团队更新',
        teamUpdatesDesc: '获取团队活动的更新',
        weeklyDigest: '每周摘要',
        weeklyDigestDesc: '接收每周总结邮件',
      },

      // Security section
      security: {
        title: '安全设置',
        changePassword: '更改密码',
        currentPassword: '当前密码',
        newPassword: '新密码',
        confirmPassword: '确认新密码',
        updatePassword: '更新密码',
        twoFactor: '双重认证',
        twoFactorStatus: '双重认证状态',
        twoFactorDesc: '为您的账户添加额外的安全保护',
        enable2fa: '启用双重认证',
      },

      // Appearance section
      appearance: {
        title: '外观设置',
        theme: '主题',
        themeDesc: '选择您喜欢的颜色主题',
        glassTransparency: '玻璃透明度',
        glassTransparencyDesc: '调整液态玻璃效果的强度',
        transparent: '透明',
        opaque: '不透明',
        starBrightness: '星星亮度',
        starBrightnessDesc: '调整闪烁星星的可见度',
        hidden: '隐藏',
        bright: '明亮',
        language: '语言',
        languageDesc: '选择您的首选语言',
        animations: '动画',
        animationsDesc: '启用或禁用界面动画',
        compactMode: '紧凑模式',
        compactModeDesc: '减少间距以获得更紧凑的布局',
      },
    },

    // Dashboard
    dashboard: {
      welcome: '欢迎回来',
      todayProgress: '今日进度',
      activeProjects: '活跃项目',
      teamMembers: '团队成员',
      totalPoints: '总积分',
      recentTasks: '最近任务',
      teamActivity: '团队活动',
      upcomingDeadlines: '即将到期',
    },

    // Tasks
    tasks: {
      title: '任务',
      subtitle: '管理和跟踪您的任务',
      newTask: '新建任务',
      allTasks: '所有任务',
      myTasks: '我的任务',
      completed: '已完成',
      inProgress: '进行中',
      pending: '待处理',
      priority: '优先级',
      dueDate: '截止日期',
      assignee: '负责人',
      noTasks: '未找到任务',
    },

    // Teams
    teams: {
      title: '团队',
      subtitle: '与您的团队协作',
      createTeam: '创建团队',
      members: '成员',
      projects: '项目',
      joinTeam: '加入团队',
    },

    // Leaderboard
    leaderboard: {
      title: '排行榜',
      subtitle: '查看您的排名',
      rank: '排名',
      player: '玩家',
      points: '积分',
      tasksCompleted: '已完成任务',
      streak: '连胜',
    },

    // Analytics
    analytics: {
      title: '分析',
      subtitle: '跟踪您的生产力指标',
      overview: '概览',
      productivity: '生产力',
      taskCompletion: '任务完成率',
      timeSpent: '花费时间',
    },

    // AI Insights
    ai: {
      title: 'AI洞察',
      subtitle: '获取智能建议',
      suggestions: '建议',
      analysis: '分析',
    },

    // Notifications
    notificationsPage: {
      title: '通知',
      noNotifications: '没有通知',
      allCaughtUp: '您已全部看完！',
      viewAllNotifications: '查看所有通知',
      taskCompleted: '任务已完成',
      newComment: '新评论',
      achievementUnlocked: '成就解锁！',
      pointsEarned: '获得积分',
      teamUpdate: '团队更新',
    },

    // Profile
    profilePage: {
      title: '个人资料',
      achievements: '成就',
      stats: '统计',
      activity: '最近活动',
    },
  },
};

export type TranslationKeys = typeof translations.en;

export function getTranslation(language: Language): TranslationKeys {
  return translations[language] as TranslationKeys || translations.en;
}
