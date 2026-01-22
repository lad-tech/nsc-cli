---
description: "TypeScript стиль кода: настройки, именование, форматирование, импорты"
globs: ["**/*.ts", "**/*.tsx"]
alwaysApply: false
---

# TypeScript и стиль кода

## Настройки TypeScript

- Строгий режим: `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`
- Экспериментальные декораторы: `experimentalDecorators: true`, `emitDecoratorMetadata: true`
- Требуется `reflect-metadata` для работы декораторов
- Всегда используйте типы, избегайте `any` (допускается только с предупреждением)
- Используйте `unknown` для неизвестных типов вместо `any`

## Именование

- Классы: `PascalCase` (например: `UsersRepository`, `OrderCreate`)
- Методы и функции: `camelCase` (например: `getUserById`, `createOrder`)
- Константы: `UPPER_SNAKE_CASE` (например: `MAX_FILE_SIZE`)
- Приватные поля: начинаются с `_` (например: `_id`, `_client`)
- Файлы: `PascalCase` для классов, `camelCase` для утилит
- Интерфейсы: `PascalCase`, часто с префиксом `I` или без него (следуйте конвенциям проекта)

## Форматирование (Prettier)

- Табы: 2 пробела
- Кавычки: одинарные
- Точка с запятой: обязательна
- Trailing comma: `all`
- Print width: 120 символов
- Arrow parens: `avoid` (когда возможно)
- Используйте `prettier-plugin-organize-imports` для автоматической организации импортов

## Импорты

### ESM модули

Все сервисы используют ESM (ES Modules) с `"type": "module"` в `package.json`.

**Важно:**

- Для локальных импортов **всегда используй расширение `.js`**, даже если файл имеет расширение `.ts`
- Это требование ESM в TypeScript: компилятор не меняет пути импортов, а в runtime файлы будут `.js`
- TypeScript автоматически разрешит `.js` импорты к соответствующим `.ts` файлам

### Порядок импортов

1. Внешние библиотеки (npm пакеты из `node_modules`)
2. Workspace пакеты (например: `'shared'`, `'namespace'`)
3. Локальные импорты (из текущего сервиса/пакета)

Между группами импортов должна быть пустая строка.

### Workspace импорты

Используй прямые импорты по имени пакета из workspace (без относительных путей):

```typescript
// ✅ Правильно - workspace импорт
import { validateConfigs, logger, Logger, LogsOutputFormatter } from 'shared';
import { codes } from 'shared';
import { ApplicationConfig } from 'shared';

// ❌ Неправильно - относительный путь к workspace пакету
import { logger } from '../../shared';
```

Workspace пакеты настраиваются через npm workspaces в корневом `package.json`.

### Локальные импорты

Для локальных импортов **всегда указывай расширение `.js`**:

```typescript
// ✅ Правильно - с расширением .js
import { TYPES } from './inversion.types.js';
import { configs, ISMTPConfig } from './configs/index.js';
import { MailSender } from './MailSender/index.js';
import type { MailSenderPort } from './domain/ports/index.js';
import { Empty } from './methods/Empty/index.js';

// ❌ Неправильно - без расширения или с .ts
import { TYPES } from './inversion.types';
import { TYPES } from './inversion.types.ts';
```

### Type-only импорты

Используй `import type` для импорта только типов (не значений):

```typescript
// ✅ Правильно - type-only импорт
import type { NatsConnection } from 'nats';
import type { EmptyRequest, EmptyResponse } from './interfaces.js';
import type { MailSenderPort } from './domain/ports/index.js';

// ✅ Правильно - смешанный импорт (типы и значения)
import { Client, Baggage, CacheSettings } from '@lad-tech/nsc-toolkit';
import type { NatsConnection } from 'nats';
```

### JSON импорты

Для импорта JSON файлов используй синтаксис `with { type: 'json' }`:

```typescript
// ✅ Правильно - JSON импорт с type assertion
import serviceSchema from './service.schema.json' with { type: 'json' };
```

### Полный пример

```typescript
// 1. Внешние библиотеки (npm пакеты)
import { DependencyType, Service, container } from '@lad-tech/nsc-toolkit';
import { connect } from 'nats';
import type { NatsConnection } from 'nats';

// 2. Workspace пакеты
import { validateConfigs, logger, Logger, LogsOutputFormatter } from 'shared';
import { codes } from 'shared';
import { ApplicationConfig } from 'shared';

// 3. Локальные импорты (с расширением .js)
import { TYPES } from './inversion.types.js';
import { configs, ISMTPConfig } from './configs/index.js';
import { MailSender } from './MailSender/index.js';
import type { MailSenderPort } from './domain/ports/index.js';
import { Empty } from './methods/Empty/index.js';
import serviceSchema from './service.schema.json' with { type: 'json' };
```

### Правила для Cursor

1. **Всегда используй расширение `.js`** для локальных импортов в TypeScript файлах
2. **Используй workspace импорты** по имени пакета (например `'shared'`), не относительные пути
3. **Разделяй группы импортов** пустыми строками (внешние → workspace → локальные)
4. **Используй `import type`** для импорта только типов
5. **Используй `with { type: 'json' }`** для импорта JSON файлов
6. **Не указывай расширения** для внешних npm пакетов и workspace пакетов

## Запрещено

- `console.log` в продакшн коде (используйте логгер из `@lad-tech/toolbelt`)
- `any` без необходимости (только с предупреждением и комментарием)
- Прямые вызовы других сервисов (используйте `service.buildService()` из `@lad-tech/nsc-toolkit`)
