/**
 * TaskMaster - AI Routes
 * Intelligent assistant for productivity
 */

const express = require('express');
const router = express.Router();

// AI Knowledge Base
const knowledgeBase = {
    tasks: {
        keywords: ['задач', 'task', 'работ', 'делать', 'выполн'],
        response: `**Работа с задачами в TaskMaster:**

• **Создание:** Нажмите "New Task" на странице Tasks
• **Приоритеты:** Low (зелёный), Medium (жёлтый), High (красный), Urgent (фиолетовый)
• **Сложность:** Easy (★), Medium (★★), Hard (★★★), Expert (★★★★)
• **Награды:** Чем сложнее задача, тем больше очков вы получите

💡 Совет: Начинайте с простых задач для разминки, затем переходите к сложным!`
    },
    shop: {
        keywords: ['магазин', 'shop', 'купить', 'товар', 'предмет'],
        response: `**Магазин TaskMaster:**

🛒 В магазине вы можете приобрести:
• **Головные уборы** - короны, шляпы, аксессуары
• **Одежда** - кастомизация персонажа
• **Фоны** - красивые фоны для аватара
• **Эффекты** - магические эффекты вокруг персонажа
• **Питомцы** - виртуальные компаньоны
• **Баннеры** - оформление профиля

💰 Тратьте заработанные звёзды с умом!`
    },
    level: {
        keywords: ['уровен', 'level', 'опыт', 'прогресс', 'exp'],
        response: `**Система уровней:**

📊 Уровни повышаются за выполнение задач:
• **Novice (1-4)** - Начальный этап
• **Apprentice (5-9)** - Ученик
• **Skilled (10-19)** - Опытный
• **Expert (20-34)** - Эксперт
• **Master (35+)** - Мастер

🎨 С каждым уровнем ваш персонаж эволюционирует!`
    },
    points: {
        keywords: ['очки', 'points', 'звёзд', 'stars', 'награ'],
        response: `**Система наград:**

⭐ Очки начисляются за:
• Выполнение задач (10-100 очков)
• Ежедневные входы (streak bonus)
• Достижения и бейджи

💎 Звёзды можно потратить в магазине на предметы для персонализации!`
    },
    chat: {
        keywords: ['чат', 'chat', 'сообщ', 'общен', 'команд'],
        response: `**Командный чат:**

💬 Возможности чата:
• **Голосовой ввод** - нажмите 🎤 для диктовки
• **Код** - нажмите {} для отправки кода с подсветкой
• **Файлы** - прикрепляйте документы и изображения
• **AI ассистент** - нажмите 🤖 для помощи

🔔 Создавайте каналы для разных проектов!`
    },
    profile: {
        keywords: ['профил', 'profile', 'аватар', 'персонаж', 'настро'],
        response: `**Ваш профиль:**

👤 Настройки профиля:
• **Аватар** - загрузите своё фото или используйте персонажа
• **Баннер** - красивая шапка профиля в стиле YouTube
• **Персонаж** - анимированный герой с кастомизацией
• **Достижения** - отслеживайте свой прогресс

🎨 Персонализируйте свой профиль в магазине!`
    },
    productivity: {
        keywords: ['продукт', 'эффект', 'совет', 'помощь', 'работ'],
        response: `**Советы по продуктивности:**

🚀 Максимизируйте эффективность:
1. **Метод Pomodoro** - 25 мин работы, 5 мин отдыха
2. **Приоритизация** - начинайте с важных задач
3. **Декомпозиция** - разбивайте большие задачи
4. **Streak** - поддерживайте ежедневную активность
5. **Награды** - мотивируйте себя покупками в магазине

💪 Consistency is key!`
    }
};

// Default response
const defaultResponse = `Привет! Я AI-ассистент TaskMaster 🤖

Я могу помочь вам с:
• 📋 Управлением задачами
• 🛒 Магазином и наградами
• 📊 Системой уровней
• 💬 Чатом и командной работой
• 👤 Настройкой профиля
• 🚀 Советами по продуктивности

Просто спросите меня о любой функции!`;

/**
 * Ask AI a question
 */
router.post('/ask', (req, res) => {
    try {
        const { question } = req.body;

        if (!question || typeof question !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Question is required'
            });
        }

        const q = question.toLowerCase();
        let answer = defaultResponse;

        // Search knowledge base
        for (const [key, data] of Object.entries(knowledgeBase)) {
            const matches = data.keywords.some(keyword => q.includes(keyword));
            if (matches) {
                answer = data.response;
                break;
            }
        }

        // Greeting detection
        if (q.match(/привет|здравств|hi|hello|хай/)) {
            answer = `Привет! 👋 Рад вас видеть в TaskMaster!

Чем могу помочь сегодня?
• Расскажу о задачах и наградах
• Помогу с настройками
• Дам советы по продуктивности

Просто спросите! 😊`;
        }

        // Thanks detection
        if (q.match(/спасиб|thank|благодар/)) {
            answer = `Всегда пожалуйста! 😊

Если будут ещё вопросы - обращайтесь!
Удачной работы в TaskMaster! 🚀`;
        }

        res.json({
            success: true,
            data: {
                answer,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('AI Error:', error);
        res.status(500).json({
            success: false,
            message: 'AI processing error'
        });
    }
});

/**
 * Summarize text
 */
router.post('/summarize', (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({
                success: false,
                message: 'Text is required'
            });
        }

        // Simple summarization (first 2-3 sentences)
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        const summary = sentences.slice(0, 3).join(' ').trim();

        res.json({
            success: true,
            data: {
                summary: summary || text.substring(0, 200) + '...',
                originalLength: text.length,
                summaryLength: summary.length
            }
        });

    } catch (error) {
        console.error('Summarize Error:', error);
        res.status(500).json({
            success: false,
            message: 'Summarization error'
        });
    }
});

/**
 * Get productivity tips
 */
router.get('/tips', (req, res) => {
    const tips = [
        { icon: '🎯', tip: 'Начните день с самой важной задачи' },
        { icon: '⏰', tip: 'Используйте технику Pomodoro: 25 мин работы, 5 мин отдыха' },
        { icon: '📝', tip: 'Записывайте идеи сразу, чтобы не забыть' },
        { icon: '🔄', tip: 'Делайте регулярные перерывы для свежего взгляда' },
        { icon: '✅', tip: 'Разбивайте большие задачи на маленькие шаги' },
        { icon: '🎮', tip: 'Награждайте себя за выполненные задачи' },
        { icon: '📊', tip: 'Отслеживайте прогресс для мотивации' },
        { icon: '🌙', tip: 'Планируйте следующий день вечером' },
        { icon: '🧹', tip: 'Держите рабочее место в порядке' },
        { icon: '💪', tip: 'Consistency важнее интенсивности' }
    ];

    const randomTip = tips[Math.floor(Math.random() * tips.length)];

    res.json({
        success: true,
        data: {
            tip: randomTip,
            allTips: tips
        }
    });
});

module.exports = router;
