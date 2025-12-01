# Комплексная стратегия безопасности TaskMaster

## Оглавление
1. [Обзор архитектуры безопасности](#обзор-архитектуры-безопасности)
2. [Защита от взлома (Hacking Prevention)](#защита-от-взлома)
3. [Защита от перебора директорий](#защита-от-перебора-директорий)
4. [Защита от brute-force атак](#защита-от-brute-force-атак)
5. [Анти-DDoS и управление трафиком](#анти-ddos-и-управление-трафиком)
6. [Мониторинг и реагирование](#мониторинг-и-реагирование)

---

## Обзор архитектуры безопасности

### Многоуровневая модель защиты (Defense in Depth)

```
┌─────────────────────────────────────────────────────────────────┐
│                     УРОВЕНЬ 1: СЕТЬ                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│  │   Nginx     │ │   WAF       │ │ Cloudflare  │                │
│  │ Rate Limit  │ │  Rules      │ │   DDoS      │                │
│  └─────────────┘ └─────────────┘ └─────────────┘                │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                   УРОВЕНЬ 2: ПРИЛОЖЕНИЕ                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│  │  Security   │ │   Input     │ │   CSRF/     │                │
│  │ Middleware  │ │ Validation  │ │   XSS       │                │
│  └─────────────┘ └─────────────┘ └─────────────┘                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│  │ Rate Limit  │ │  IP Block   │ │  Brute-     │                │
│  │   Engine    │ │   Service   │ │  Force      │                │
│  └─────────────┘ └─────────────┘ └─────────────┘                │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                     УРОВЕНЬ 3: ДАННЫЕ                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│  │   Prisma    │ │  Encrypted  │ │   Audit     │                │
│  │   (ORM)     │ │   Secrets   │ │   Logs      │                │
│  └─────────────┘ └─────────────┘ └─────────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

### Ключевые компоненты безопасности

| Компонент | Назначение | Файл |
|-----------|-----------|------|
| SecurityMiddleware | Центральный middleware безопасности | `security/security.middleware.ts` |
| RateLimitService | Гибкий rate limiting с Redis | `security/rate-limit.service.ts` |
| BruteForceProtection | Защита от перебора паролей | `security/brute-force.service.ts` |
| DirectoryProtection | Защита от fuzzing | `security/directory-protection.middleware.ts` |
| ThreatDetection | Обнаружение угроз | `security/threat-detection.service.ts` |
| CaptchaService | CAPTCHA интеграция | `security/captcha.service.ts` |

---

## Защита от взлома

### 1. SQL Injection Prevention

**Текущая защита:** Prisma ORM с параметризованными запросами

```typescript
// ✅ Безопасно - Prisma автоматически экранирует
const user = await prisma.user.findUnique({
  where: { email: userInput }
});

// ❌ НИКОГДА не использовать raw SQL с пользовательским вводом
// await prisma.$queryRawUnsafe(`SELECT * FROM users WHERE email = '${email}'`);
```

**Дополнительные меры:**
- Валидация входных данных через Zod schemas
- Строгая типизация TypeScript
- Deny-list для SQL ключевых слов в API параметрах

### 2. XSS (Cross-Site Scripting) Prevention

**HTTP Headers (Helmet):**
```typescript
await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
});
```

**Input Sanitization:**
```typescript
import DOMPurify from 'isomorphic-dompurify';

function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  });
}
```

### 3. CSRF (Cross-Site Request Forgery) Prevention

**Double Submit Cookie Pattern:**
```typescript
// Генерация CSRF токена
function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Middleware для проверки
app.addHook('preHandler', async (request, reply) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const headerToken = request.headers['x-csrf-token'];
    const cookieToken = request.cookies['csrf-token'];

    if (!headerToken || !cookieToken || headerToken !== cookieToken) {
      return reply.status(403).send({ error: 'CSRF_TOKEN_INVALID' });
    }
  }
});
```

### 4. Security Headers Matrix

| Header | Значение | Назначение |
|--------|----------|-----------|
| `X-Content-Type-Options` | `nosniff` | Предотвращает MIME sniffing |
| `X-Frame-Options` | `DENY` | Защита от clickjacking |
| `X-XSS-Protection` | `1; mode=block` | XSS фильтр браузера |
| `Strict-Transport-Security` | `max-age=31536000` | Принудительный HTTPS |
| `Content-Security-Policy` | См. выше | Контроль загрузки ресурсов |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Контроль referrer |
| `Permissions-Policy` | `camera=(), microphone=()` | Ограничение API браузера |

---

## Защита от перебора директорий

### Стратегия защиты

```
┌────────────────────────────────────────────────────────────────┐
│                    Directory Fuzzing Protection                 │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Request ──► Pattern Detection ──► Rate Check ──► Response    │
│                      │                   │              │       │
│                      ▼                   ▼              ▼       │
│               [Suspicious?]        [Too Fast?]    [Block/Allow] │
│                      │                   │              │       │
│                      ▼                   ▼              ▼       │
│               Log + Score         Delay/Block      404/403      │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### 1. Обнаружение подозрительных паттернов

```typescript
const SUSPICIOUS_PATTERNS = [
  // Админ-панели
  /\/(admin|administrator|wp-admin|cpanel|phpmyadmin)/i,
  // Конфигурационные файлы
  /\.(env|config|ini|yml|yaml|json|xml|conf)$/i,
  // Бэкапы
  /\.(bak|backup|old|orig|save|swp|tmp)$/i,
  // Скрытые файлы
  /\/\.[^/]+/,
  // Обход директорий
  /\.\.\//,
  /\.\.%2[fF]/,
  // Распространенные уязвимые пути
  /\/(\.git|\.svn|\.hg|\.bzr|CVS)\//,
  /\/(vendor|node_modules|composer)\//,
  // SQL файлы
  /\.(sql|sqlite|db)$/i,
  // Логи
  /\.(log|logs)$/i,
];
```

### 2. Скоринг угроз

```typescript
interface ThreatScore {
  ip: string;
  score: number;
  recentRequests: number;
  suspiciousPatterns: number;
  lastSeen: Date;
}

// Пороговые значения
const THRESHOLDS = {
  WARNING: 10,      // Начинаем мониторинг
  RATE_LIMIT: 25,   // Замедляем ответы
  CAPTCHA: 50,      // Требуем CAPTCHA
  BLOCK: 100,       // Блокируем IP
};
```

### 3. Адаптивная задержка ответов

```typescript
async function calculateDelay(threatScore: number): Promise<number> {
  if (threatScore < 10) return 0;
  if (threatScore < 25) return 100;   // 100ms
  if (threatScore < 50) return 500;   // 500ms
  if (threatScore < 100) return 2000; // 2s
  return 5000; // 5s для очень подозрительных
}
```

### 4. Унификация ответов на ошибки

```typescript
// Все несуществующие маршруты возвращают идентичный ответ
app.setNotFoundHandler(async (request, reply) => {
  // Добавляем случайную задержку для предотвращения timing attacks
  await delay(randomInt(50, 150));

  return reply.status(404).send({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Resource not found' }
  });
});
```

---

## Защита от Brute-Force атак

### Многоуровневая стратегия

```
┌─────────────────────────────────────────────────────────────────┐
│                    Brute-Force Protection Layers                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: Per-IP Rate Limiting                                  │
│  ├── 5 попыток / минуту на один IP                              │
│  └── Блокировка на 15 минут при превышении                      │
│                                                                  │
│  Layer 2: Per-Account Rate Limiting                             │
│  ├── 10 попыток / час на один аккаунт                           │
│  └── Прогрессивная блокировка (15мин → 1ч → 24ч)               │
│                                                                  │
│  Layer 3: Global Rate Limiting                                  │
│  ├── Мониторинг общего числа неудачных попыток                  │
│  └── Активация CAPTCHA при аномалиях                            │
│                                                                  │
│  Layer 4: Device Fingerprinting                                 │
│  ├── Отслеживание уникальных устройств                          │
│  └── Блокировка при смене аккаунтов                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Redis-схема для хранения состояния

```typescript
// Ключи Redis
const REDIS_KEYS = {
  // Попытки входа по IP
  loginAttempts: (ip: string) => `security:login:ip:${ip}`,

  // Попытки входа по email
  accountAttempts: (email: string) => `security:login:account:${hash(email)}`,

  // Заблокированные IP
  blockedIp: (ip: string) => `security:blocked:ip:${ip}`,

  // Заблокированные аккаунты
  lockedAccount: (email: string) => `security:locked:account:${hash(email)}`,

  // Глобальный счетчик
  globalFailedLogins: 'security:global:failed-logins',

  // CAPTCHA сессии
  captchaRequired: (ip: string) => `security:captcha:required:${ip}`,
};
```

### Алгоритм прогрессивной блокировки

```typescript
function calculateLockoutDuration(failedAttempts: number): number {
  const BASE_LOCKOUT = 15 * 60; // 15 минут в секундах

  if (failedAttempts <= 5) return 0;
  if (failedAttempts <= 10) return BASE_LOCKOUT;
  if (failedAttempts <= 15) return BASE_LOCKOUT * 4;  // 1 час
  if (failedAttempts <= 20) return BASE_LOCKOUT * 96; // 24 часа

  return BASE_LOCKOUT * 672; // 7 дней
}
```

### Уведомления о подозрительной активности

```typescript
async function notifySecurityTeam(event: SecurityEvent): Promise<void> {
  const notification = {
    type: 'SECURITY_ALERT',
    severity: event.severity,
    details: {
      ip: event.ip,
      targetAccount: event.email,
      attemptCount: event.attempts,
      timestamp: new Date().toISOString(),
      geoLocation: await getGeoLocation(event.ip),
    }
  };

  // Отправка в систему мониторинга
  await alertingService.send(notification);

  // Логирование для аудита
  logger.security(notification);
}
```

---

## Анти-DDoS и управление трафиком

### Архитектура защиты от DDoS

```
                        ┌──────────────┐
                        │   Internet   │
                        └──────┬───────┘
                               │
                    ┌──────────▼───────────┐
                    │    Cloudflare/CDN    │
                    │  (L3/L4 DDoS Prot.)  │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │       Nginx          │
                    │  (Rate Limit + WAF)  │
                    └──────────┬───────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
┌────────▼────────┐  ┌────────▼────────┐  ┌────────▼────────┐
│   App Server 1  │  │   App Server 2  │  │   App Server N  │
│  (Fastify +     │  │  (Fastify +     │  │  (Fastify +     │
│   Security MW)  │  │   Security MW)  │  │   Security MW)  │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                     │                     │
         └─────────────────────┼─────────────────────┘
                               │
                    ┌──────────▼───────────┐
                    │        Redis         │
                    │  (Shared Rate State) │
                    └──────────────────────┘
```

### 1. Sliding Window Rate Limiting

```typescript
interface RateLimitConfig {
  windowMs: number;      // Размер окна в мс
  maxRequests: number;   // Максимум запросов
  keyGenerator: (req: FastifyRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// Конфигурации для разных эндпоинтов
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Глобальный лимит
  global: {
    windowMs: 60 * 1000,    // 1 минута
    maxRequests: 100,
    keyGenerator: (req) => getClientIp(req),
  },

  // Аутентификация
  auth: {
    windowMs: 15 * 60 * 1000, // 15 минут
    maxRequests: 5,
    keyGenerator: (req) => getClientIp(req),
  },

  // API
  api: {
    windowMs: 60 * 1000,    // 1 минута
    maxRequests: 60,
    keyGenerator: (req) => `${getClientIp(req)}:${req.user?.id || 'anon'}`,
  },

  // Тяжелые операции
  heavy: {
    windowMs: 60 * 1000,    // 1 минута
    maxRequests: 10,
    keyGenerator: (req) => req.user?.id || getClientIp(req),
  },
};
```

### 2. Обнаружение аномалий трафика

```typescript
interface TrafficMetrics {
  requestsPerSecond: number;
  uniqueIpsPerMinute: number;
  errorRate: number;
  avgResponseTime: number;
}

class AnomalyDetector {
  private baseline: TrafficMetrics;
  private readonly THRESHOLDS = {
    requestsMultiplier: 3,      // 3x от базовой линии
    errorRateThreshold: 0.3,    // 30% ошибок
    uniqueIpsMultiplier: 5,     // 5x уникальных IP
  };

  async detectAnomaly(current: TrafficMetrics): Promise<AnomalyResult> {
    const anomalies: string[] = [];

    if (current.requestsPerSecond > this.baseline.requestsPerSecond * this.THRESHOLDS.requestsMultiplier) {
      anomalies.push('HIGH_REQUEST_RATE');
    }

    if (current.errorRate > this.THRESHOLDS.errorRateThreshold) {
      anomalies.push('HIGH_ERROR_RATE');
    }

    if (current.uniqueIpsPerMinute > this.baseline.uniqueIpsPerMinute * this.THRESHOLDS.uniqueIpsMultiplier) {
      anomalies.push('IP_FLOOD');
    }

    return {
      isAnomaly: anomalies.length > 0,
      types: anomalies,
      severity: this.calculateSeverity(anomalies),
    };
  }
}
```

### 3. Автоматическая активация защитных мер

```typescript
enum ProtectionLevel {
  NORMAL = 0,
  ELEVATED = 1,    // Повышенный мониторинг
  HIGH = 2,        // Ужесточение rate limits
  CRITICAL = 3,    // CAPTCHA для всех
  LOCKDOWN = 4,    // Только whitelist IP
}

class DDoSProtection {
  private currentLevel: ProtectionLevel = ProtectionLevel.NORMAL;

  async adjustProtection(anomaly: AnomalyResult): Promise<void> {
    const newLevel = this.calculateLevel(anomaly);

    if (newLevel !== this.currentLevel) {
      await this.applyProtectionLevel(newLevel);
      await this.notifyOperations(newLevel, anomaly);
      this.currentLevel = newLevel;
    }
  }

  private async applyProtectionLevel(level: ProtectionLevel): Promise<void> {
    switch (level) {
      case ProtectionLevel.ELEVATED:
        await this.enableDetailedLogging();
        break;
      case ProtectionLevel.HIGH:
        await this.tightenRateLimits(0.5); // 50% от нормы
        break;
      case ProtectionLevel.CRITICAL:
        await this.enableCaptchaForAll();
        break;
      case ProtectionLevel.LOCKDOWN:
        await this.enableWhitelistMode();
        break;
    }
  }
}
```

### 4. CAPTCHA интеграция

```typescript
interface CaptchaConfig {
  provider: 'recaptcha' | 'hcaptcha' | 'turnstile';
  siteKey: string;
  secretKey: string;
  threshold: number; // Минимальный score (0-1)
}

class CaptchaService {
  async verify(token: string, ip: string): Promise<CaptchaResult> {
    const response = await fetch(this.verifyUrl, {
      method: 'POST',
      body: new URLSearchParams({
        secret: this.config.secretKey,
        response: token,
        remoteip: ip,
      }),
    });

    const data = await response.json();

    return {
      success: data.success && data.score >= this.config.threshold,
      score: data.score,
      action: data.action,
    };
  }

  async isRequired(ip: string): Promise<boolean> {
    const key = `security:captcha:required:${ip}`;
    return await redis.exists(key) === 1;
  }

  async requireCaptcha(ip: string, duration: number = 3600): Promise<void> {
    const key = `security:captcha:required:${ip}`;
    await redis.setex(key, duration, '1');
  }
}
```

---

## Мониторинг и реагирование

### Security Event Logging

```typescript
interface SecurityLog {
  timestamp: string;
  eventType: SecurityEventType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ip: string;
  userId?: string;
  userAgent: string;
  path: string;
  method: string;
  details: Record<string, unknown>;
}

enum SecurityEventType {
  FAILED_LOGIN = 'FAILED_LOGIN',
  BRUTE_FORCE_DETECTED = 'BRUTE_FORCE_DETECTED',
  DIRECTORY_FUZZING = 'DIRECTORY_FUZZING',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_PATTERN = 'SUSPICIOUS_PATTERN',
  IP_BLOCKED = 'IP_BLOCKED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  DDOS_SUSPECTED = 'DDOS_SUSPECTED',
  CAPTCHA_FAILED = 'CAPTCHA_FAILED',
}
```

### Prometheus Metrics

```typescript
const securityMetrics = {
  failedLoginAttempts: new Counter({
    name: 'security_failed_login_attempts_total',
    help: 'Total failed login attempts',
    labelNames: ['ip', 'reason'],
  }),

  blockedRequests: new Counter({
    name: 'security_blocked_requests_total',
    help: 'Total blocked requests',
    labelNames: ['reason'],
  }),

  rateLimitHits: new Counter({
    name: 'security_rate_limit_hits_total',
    help: 'Rate limit hits',
    labelNames: ['endpoint', 'ip'],
  }),

  suspiciousActivity: new Gauge({
    name: 'security_suspicious_activity_score',
    help: 'Current suspicious activity score by IP',
    labelNames: ['ip'],
  }),

  protectionLevel: new Gauge({
    name: 'security_protection_level',
    help: 'Current DDoS protection level (0-4)',
  }),
};
```

### Grafana Dashboard Queries

```promql
# Неудачные попытки входа за последний час
sum(increase(security_failed_login_attempts_total[1h]))

# Top-10 заблокированных IP
topk(10, sum by (ip) (security_blocked_requests_total))

# Текущий уровень защиты
security_protection_level

# Аномалии трафика
rate(http_requests_total[5m]) / rate(http_requests_total[1h] offset 1d)
```

---

## Чек-лист внедрения

### Немедленные действия (Критические)
- [ ] Установить security middleware
- [ ] Настроить rate limiting для /auth endpoints
- [ ] Включить brute-force protection
- [ ] Настроить security headers

### Краткосрочные (1-2 недели)
- [ ] Внедрить CAPTCHA интеграцию
- [ ] Настроить directory fuzzing protection
- [ ] Реализовать threat scoring
- [ ] Настроить security logging

### Среднесрочные (1 месяц)
- [ ] Интегрировать с Cloudflare/WAF
- [ ] Настроить Prometheus + Grafana мониторинг
- [ ] Реализовать автоматическое реагирование на угрозы
- [ ] Провести penetration testing

### Долгосрочные
- [ ] Внедрить machine learning для обнаружения аномалий
- [ ] Реализовать geo-blocking
- [ ] Настроить automated incident response
- [ ] Регулярный security audit

---

## Контакты и эскалация

| Уровень угрозы | Время реакции | Эскалация |
|---------------|---------------|-----------|
| LOW | 24 часа | Security Team |
| MEDIUM | 4 часа | Security Lead |
| HIGH | 1 час | CTO + Security Lead |
| CRITICAL | 15 минут | CEO + CTO + Security Team |
