

**NSC-Toolkit-CLI** — это набор инструментов командной строки, включающий две основные утилиты: **NSC-CRUD** и **NSC-CLI**. Эти утилиты предназначены для автоматизации различных аспектов разработки сервисов, обеспечивая быстрое и эффективное создание CRUD операций и генерацию новых сервисов на основе JSON-схем.

## Содержание

1. [Введение](#введение)
2. [Установка](#установка)
3. [NSC-CRUD](#nsc-crud)
    - [Особенности](#особенности-nsc-crud)
    - [Использование](#использование-nsc-crud)
        - [Структура Команды](#структура-команды-nsc-crud)
        - [Опции](#опции-nsc-crud)
        - [Пример Использования](#пример-использования-nsc-crud)
    - [Определение Схемы](#определение-схемы-nsc-crud)
        - [Пример Схемы](#пример-схемы-nsc-crud)
        - [Компоненты Схемы](#компоненты-схемы-nsc-crud)
        - [Валидация Схемы](#валидация-схемы-nsc-crud)
    - [Генерируемые Файлы](#генерируемые-файлы-nsc-crud)
4. [NSC-CLI](#nsc-cli)
    - [Особенности](#особенности-nsc-cli)
    - [Использование](#использование-nsc-cli)
        - [Структура Команды](#структура-команды-nsc-cli)
        - [Опции](#опции-nsc-cli)
        - [Пример Использования](#пример-использования-nsc-cli)
        - [Применение `.nscignore`](#применение-nscignore-nsc-cli)
    - [Определение Схемы](#определение-схемы-nsc-cli)
        - [Пример Схемы](#пример-схемы-nsc-cli)
        - [Компоненты Схемы](#компоненты-схемы-nsc-cli)
        - [Использование `$ref`](#использование-ref-nsc-cli)
    - [Генерируемые Файлы](#генерируемые-файлы-nsc-cli)
    - [Обработка Ошибок](#обработка-ошибок-nsc-cli)
    - [Вклад](#вклад-nsc-cli)
5. [Поддержка](#поддержка)

---

## Введение

**NSC-Toolkit** — это мощный набор инструментов командной строки, разработанный для автоматизации создания CRUD операций и генерации новых сервисов на основе JSON-схем. Включает две основные утилиты:

- **NSC-CRUD**: Автоматизирует генерацию CRUD (Create, Read, Update, Delete) операций для ваших сущностей.
- **NSC-CLI**: Обеспечивает быстрое создание новых сервисов с использованием JSON-схем и поддерживает интеграцию с [nsc-toolkit](https://github.com/lad-tech/nsc-toolkit).


## Установка


Для установки **NSC-Toolkit** глобально с помощью npm или yarn выполните следующие команды:

```bash
# С использованием npm
npm install -g @lad-tech/nsc-cli

# С использованием yarn
yarn global add @lad-tech/nsc-cli
```

## NSC-CRUD

**NSC-CRUD** — это утилита из набора **NSC-Toolkit**, предназначенная для автоматизации генерации CRUD операций для ваших сущностей на основе предварительно определенной JSON-схемы.
[API.md](./API.md)
### Особенности NSC-CRUD

- **Валидация Схемы**: Проверяет соответствие предоставленной схемы необходимой структуре с помощью AJV.
- **Автоматическая Генерация Файлов**: Создает необходимые CRUD файлы, такие как репозитории, интерфейсы, сервисы и другие.
- **Неизменяемость Сгенерированных Методов**: Уже сгенерированные методы не изменяются при повторной генерации, изменяются только интерфейсы.
- **Поддержка `.nscignore`**: Можно разместить файл `.nscignore` в корне сервиса (синтаксис gitignore), и указанные файлы не будут перезаписаны.
- **Использование `$ref` в Контрактах Методов**: В `service.schema.json` можно описать блок `Ref` для использования ссылок в контрактах методов.
- **Поддержка TypeScript**: Использует ts-morph для бесшовной интеграции с TypeScript проектом.

### Использование NSC-CRUD

#### Структура Команды NSC-CRUD

Основная структура команды **NSC-CRUD** выглядит следующим образом:

```bash
nsc-crud --schema <путь-к-схеме>
```

#### Опции NSC-CRUD

| Опция               | Описание                                                                                           | Обязательно | По Умолчанию |
| ------------------- | -------------------------------------------------------------------------------------------------- | ----------- | ------------ |
| `--schema` `<path>` | Путь к файлу JSON-схемы, определяющему сущность, для которой будут сгенерированы CRUD операции.   | Да          | N/A          |
| `-h`, `--help`      | Отображает справку по команде.                                                                     | Нет         | N/A          |

#### Пример Использования NSC-CRUD

```bash
nsc-crud --schema ./schemas/notification.schema.json
```

Эта команда генерирует CRUD операции на основе файла `notification.schema.json`, расположенного в директории `./schemas`.

### Определение Схемы NSC-CRUD

**NSC-CRUD** использует определенную структуру JSON-схемы для генерации необходимых CRUD файлов. Схема определяет свойства сущности, их типы, правила валидации и методы сервиса.

#### Пример Схемы NSC-CRUD

```json
{
  "entityName": "Notification",
  "entityData": {
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "description": "Заголовок уведомления",
        "minLength": 1
      },
      "description": {
        "type": "string",
        "description": "Описание уведомления",
        "minLength": 1
      },
      "deeplink": {
        "type": "string",
        "format": "uri",
        "description": "URL для диплинков"
      },
      "topic": {
        "type": "string",
        "enum": ["general", "direct"],
        "description": "Тип уведомления: general - всем, direct - конкретным пользователям"
      },
      "fcm": {
        "type": "array",
        "description": "Fcm пользователей, для которых это уведомление. Если пустой, то для всех",
        "items": {
          "type": "string",
          "format": "uuid"
        },
        "default": []
      },
      "userIds": {
        "type": "array",
        "description": "ID пользователей, для которых это уведомление. Если пустой, то для всех",
        "items": {
          "type": "string",
          "format": "uuid"
        },
        "default": []
      }
    },
    "required": ["title", "description", "topic"],
    "additionalProperties": false
  },
  "filterColumns": ["title", "description", "topic"]
}
```

#### Компоненты Схемы NSC-CRUD

- **entityName**: Название сущности, для которой будут сгенерированы CRUD операции.
- **entityData**: Определяет структуру и свойства сущности.
    - **type**: Должно быть `"object"`.
    - **properties**: Опишите поля как в JsonSchema
    - **required**: Обязательные поля.
    - **additionalProperties**: Запрещает свойства, не определенные в разделе `properties`.
- **filterColumns**: Массив строк, указывающих, какие столбцы могут использоваться для фильтрации.

#### Валидация Схемы NSC-CRUD

Перед генерацией CRUD файлов, **NSC-CRUD** валидирует предоставленную схему с помощью **AJV** . Это гарантирует, что схема соответствует необходимой структуре и правилам.

Если валидация схемы не проходит, **NSC-CRUD** выведет ошибки валидации и завершит процесс.

### Генерируемые Файлы NSC-CRUD

После успешной валидации схемы, **NSC-CRUD** генерирует несколько важных файлов для облегчения CRUD операций в вашем сервисе. Ниже приведен список генерируемых файлов и их назначение:

1. **Файлы Схем**:
    - `service.schema.json`: Основной файл схемы для сервиса.
    - `crudSchema.json`: Валидированная CRUD схема.

2. **CRUD Файлы**:
    - `aggregate.ts`: Логика агрегации для сущности.
    - `crudMethods.ts`: Стандартные CRUD методы (Create, Read, Update, Delete).
    - `repository.ts`: Реализация паттерна репозитория для доступа к данным.
    - `interfaces.ts`: TypeScript интерфейсы, определяющие структуру сущности.
    - `di.ts`: Настройка Dependency Injection для сервиса.
    - `index.ts`: Точка входа для CRUD операций.

3. **Общие Файлы**:
    - `generalFiles.ts`: Общие утилиты и помощники.
    - `generateStartFile.ts`: Скрипт для запуска сервиса.
    - `generateServerFile.ts`: Конфигурация и настройка сервера.
    - `generateIndexFile.ts`: Основной индексный файл для экспорта модулей.

4. **Конфигурационные Файлы**:
    - `tsconfig.json`: Файл конфигурации TypeScript (если не существует).

> **Примечание**: Точная структура и наименование генерируемых файлов могут варьироваться в зависимости от конвенций проекта и конкретных деталей реализации **NSC-CRUD**.




## NSC-CLI

**NSC-CLI** — это утилита из набора **NSC-Toolkit**, предназначенная для быстрого создания новых сервисов на основе JSON-схем. Создана для быстрой генерации сервисов с использованием [nsc-toolkit](https://github.com/lad-tech/nsc-toolkit).

### Особенности NSC-CLI

- **Валидация Схемы**: Проверяет соответствие предоставленной схемы необходимой структуре.
- **Генерация Базового Содержания Сервиса**: Автоматически создает базовые файлы и структуру для нового сервиса.
- **Неизменяемость Уже Сгенерированных Файлов**: Уже сгенерированные файлы не изменяются, только интерфейсы обновляются.
- **Поддержка `.nscignore`**: Можно разместить файл `.nscignore` в корне сервиса (синтаксис gitignore), и указанные файлы не будут перезаписаны.
- **Использование `$ref` в Контрактах Методов**: В `service.schema.json` можно описать блок `Ref` для использования ссылок в контрактах методов.


#### Структура Команды NSC-CLI

Основная структура команды **NSC-CLI** выглядит следующим образом:

```bash
nsc-cli --schema <путь-к-схеме>
```

#### Опции NSC-CLI

| Опция              | Описание                                                 | Обязательно | По Умолчанию |
| ------------------ | -------------------------------------------------------- | ----------- | ------------ |
| `--schema` `<path>` | Путь к файлу JSON-схемы, определяющему сервис для генерации. | Да          | N/A          |
| `-h`, `--help`      | Отображает справку по команде.                           | Нет         | N/A          |

#### Пример Использования NSC-CLI

```bash
nsc-cli --schema ./services/myService/service.json
```

Эта команда генерирует новый сервис на основе файла `service.json`, расположенного в директории `./services/myService`.

#### Применение `.nscignore` в NSC-CLI

Вы можете создать файл `.nscignore` в корне сервиса для указания файлов, которые не должны перезаписываться при генерации. Синтаксис аналогичен файлу `.gitignore`.

**Пример `.nscignore`:**

```gitignore
**/service.ts
**/package.json
```

В данном примере файлы `service.ts` и `package.json` не будут перезаписываться при повторной генерации.

### Определение Схемы NSC-CLI

**NSC-CLI** использует определенную структуру JSON-схемы для генерации необходимых файлов сервиса. Схема определяет свойства сервиса, методы, их запросы и ответы.

#### Пример Схемы NSC-CLI

```json
{
  "name": "Math",
  "description": "Mathematics service",
  "methods": {
    "Sum": {
      "action": "sum",
      "description": "Addition of two numbers",
      "options": {},
      "request": {
        "type": "object",
        "properties": {
          "a": {
            "type": "number"
          },
          "b": {
            "type": "number"
          }
        },
        "required": [
          "a",
          "b"
        ]
      },
      "response": {
        "type": "object",
        "properties": {
          "result": {
            "type": "number"
          }
        },
        "required": [
          "result"
        ]
      }
    },
    "Fibonacci": {
      "action": "fibonacci",
      "description": "Return Fibonacci sequence given length",
      "options": {
        "useStream": {
          "response": true
        }
      },
      "request": {
        "type": "object",
        "properties": {
          "length": {
            "type": "number"
          }
        },
        "required": [
          "length"
        ]
      },
      "response": {
        "type": "number"
      }
    },
    "SumStream": {
      "action": "sumstream",
      "description": "Adding all the numbers of the stream",
      "options": {
        "useStream": {
          "request": true
        }
      },
      "request": {
        "type": "number"
      },
      "response": {
        "type": "object",
        "properties": {
          "result": {
            "type": "number"
          }
        },
        "required": [
          "result"
        ]
      }
    }
  }
}
```

#### Компоненты Схемы NSC-CLI

- **name**: Название сервиса.
- **description**: Описание сервиса.
- **methods**: Определяет методы сервиса с их действиями, описаниями, запросами и ответами.
    - **action**: Действие, выполняемое методом.
    - **description**: Описание метода.
    - **options**: Дополнительные опции для метода (например, использование стримов).
    - **request**: Описание структуры запроса.
        - **type**: Тип данных (обычно `"object"`).
        - **properties**: Свойства запроса с их типами.
        - **required**: Обязательные поля запроса.
    - **response**: Описание структуры ответа.
        - **type**: Тип данных ответа (может быть объектом или примитивом).
        - **properties**: Свойства ответа с их типами (если тип — объект).
        - **required**: Обязательные поля ответа.
- **definitions**: Содержит определения для повторного использования, например, для ссылок `$ref`.

#### Использование `$ref` в NSC-CLI

Вы можете использовать `$ref` для переиспользования определений в схеме. Это полезно для сокращения повторяющегося кода и улучшения структуры схемы.

**Пример использования `$ref`:**

```json
{
  "name": "Payments",
  "description": "Сервис payments",
  "methods": {
    "CreatePayment": {
      "action": "createPayment",
      "description": "Создание платежа",
      "request": {
        "type": "object",
        "properties": {
          "paymentProviderType": {
            "enum": ["youkassa"],
            "description": "Платежная система"
          },
          "meta": {
            "type": "object",
            "properties": {
              "amount": {
                "type": "string",
                "description": "Сумма оплаты за заказ"
              },
              "orderNumber": {
                "type": "string",
                "description": "Номер заказа"
              },
              "clientIp": {
                "type": "string",
                "description": "IP Клиента"
              },
              "paymentToken": {
                "type": "string",
                "description": "IP Клиента"
              },
              "paymentType": {
                "type": "string",
                "description": "Пока доступны bank_card и ]yoo_money",

                "enum": [
                  "bank_card",
                  "apple_pay",
                  "google_pay",
                  "yoo_money",
                  "qiwi",
                  "webmoney",
                  "sberbank",
                  "alfabank",
                  "tinkoff_bank",
                  "b2b_sberbank",
                  "sbp",
                  "mobile_balance",
                  "cash",
                  "installments"
                ]
              }
            },
            "required": ["amount", "orderNumber"]
          }
        },
        "required": ["paymentProviderType", "meta"]
      },
      "response": {
        "oneOf": [
          {
            "type": "object",
            "properties": {
              "data": {
                "type": "object",
                "properties": {
                  "id": {
                    "type": "string",
                    "description": "Уникальный идентификатор платежа"
                  },
                  "status": {
                    "type": ["string", "null"],
                    "description": "Статус платежа"
                  },
                  "paid": {
                    "type": "boolean",
                    "description": "Флаг, указывающий, был ли платеж оплачен"
                  },
                  "amount": {
                    "type": ["object", "null"],
                    "description": "Сумма платежа",
                    "properties": {
                      "value": {
                        "type": "string",
                        "description": "Сумма платежа"
                      },
                      "currency": {
                        "type": "string",
                        "description": "Код валюты"
                      }
                    }
                  },
                  "incomeAmount": {
                    "type": ["object", "null"],
                    "description": "Сумма, зачисленная получателю"
                  },
                  "refundedAmount": {
                    "type": ["object", "null"],
                    "description": "Возвращенная сумма"
                  },
                  "createdAt": {
                    "type": "string",
                    "description": "Дата и время создания платежа"
                  },
                  "expiresAt": {
                    "type": ["string", "null"],
                    "description": "Дата и время истечения платежа"
                  },
                  "capturedAt": {
                    "type": ["string", "null"],
                    "description": "Дата и время подтверждения платежа"
                  },
                  "description": {
                    "type": "string",
                    "description": "Описание платежа"
                  },
                  "paymentToken": {
                    "type": "string",
                    "description": "Токен платежа"
                  },
                  "paymentMethodId": {
                    "type": "string",
                    "description": "Идентификатор способа оплаты"
                  },
                  "paymentMethodData": {
                    "type": ["object", "null"],
                    "description": "Данные способа оплаты"
                  },
                  "paymentMethod": {
                    "type": ["object", "null"],
                    "description": "Метод оплаты"
                  },
                  "recipient": {
                    "type": ["object", "null"],
                    "description": "Получатель платежа",
                    "properties": {
                      "account_id": {
                        "type": "string",
                        "description": "Идентификатор учетной записи получателя"
                      },
                      "gateway_id": {
                        "type": "string",
                        "description": "Идентификатор шлюза получателя"
                      }
                    }
                  },
                  "confirmation": {
                    "type": ["object", "null"],
                    "description": "Подтверждение платежа",
                    "properties": {
                      "type": {
                        "type": "string",
                        "description": "Тип подтверждения"
                      },
                      "confirmation_url": {
                        "type": "string",
                        "description": "URL для подтверждения платежа"
                      }
                    }
                  },
                  "refundable": {
                    "type": "boolean",
                    "description": "Флаг, указывающий, можно ли вернуть платеж"
                  },
                  "clientIp": {
                    "type": "string",
                    "description": "IP-адрес клиента"
                  },
                  "receipt": {
                    "type": ["object", "null"],
                    "description": "Квитанция"
                  },
                  "metadata": {
                    "type": "object",
                    "description": "Дополнительные данные"
                  }
                },
                "required": [
                  "id",
                  "paid",
                  "createdAt",
                  "description",
                  "paymentToken",
                  "paymentMethodId",
                  "refundable",
                  "clientIp",
                  "metadata"
                ]
              }
            },
            "required": ["data"]
          },

          {
            "type": "object",
            "properties": {
              "error": {
                "$ref": "PaymentsServiceAdditional.json#/properties/ErrorResponse"
              }
            },
            "required": ["error"]
          }
        ]
      }
    },
    "PaymentCallbackRequest": {
      "action": "paymentCallbackRequest",
      "description": "Обработка веб хука оплаты",
      "request": {
        "$ref": "PaymentsServiceAdditional.json#/properties/PaymentCallback"
      },
      "response": {
        "oneOf": [
          {
            "type": "object",
            "properties": {}
          },
          {
            "type": "object",
            "properties": {
              "error": {
                "$ref": "PaymentsServiceAdditional.json#/properties/ErrorResponse"
              }
            },
            "required": ["error"]
          }
        ]
      }
    }
  },
  "Ref": {
    "$id": "PaymentsServiceAdditional.json",
    "type": "object",
    "properties": {
      "ErrorResponse": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "minLength": 8,
            "maxLength": 255
          },
          "message": {
            "type": "string",
            "minLength": 8,
            "maxLength": 255
          },
          "statusCode": {
            "type": "number",
            "description": "HTTP код ошибки",
            "minimum": 100,
            "maximum": 511
          }
        },
        "required": ["message"]
      },
      "pagination": {
        "type": "object",
        "properties": {
          "page": {
            "type": "integer",
            "minimum": 1,
            "description": "Номер страницы"
          },
          "size": {
            "type": "integer",
            "minimum": 1,
            "description": "Размер страницы"
          },
          "total": {
            "type": "integer",}
    }
  },
  "events": {
    "list": {
      "PaymentUpdateEvent": {
        "action": "PaymentUpdateEvent",
        "description": "Событие изменения соcтояния оплаты",
        "event": {
          "type": "object",
          "properties": {
            "event": {
              "type": "string",
              "enum": ["payment.waiting_for_capture", "payment.succeeded", "payment.canceled", "refund.succeeded"],
              "description": "Событие, например, 'payment.succeeded' или 'payment.canceled'."
            },
            "id": {
              "type": "string",
              "description": "Уникальный идентификатор платежа в системе ЮKassa."
            },
            "orderNumber": {
              "type": "string",
              "description": "Уникальный идентификатор платежа в системе ЮKassa."
            },

            "status": {
              "type": "string",
              "description": "Статус платежа, например, 'succeeded' или 'canceled'."
            },
            "amount": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "string",
                  "description": "Сумма платежа в виде строки для поддержки формата денежных значений."
                },
                "currency": {
                  "type": "string",
                  "description": "Валюта платежа, например, 'RUB'."
                }
              },
              "required": ["value", "currency"],
              "additionalProperties": false
            },
            "created": {
              "type": "string",
              "format": "date-time",
              "description": "Дата и время создания платежа в формате ISO 8601."
            },
            "description": {
              "type": "string",
              "description": "Описание платежа, если указано.",
              "nullable": true
            }
          },
          "required": ["event", "id", "orderNumber", "status", "amount", "created", "description"]
        }
      }
    },
    "streamOptions": {
      "prefix": "stream",
      "actions": [
        {
          "action": "*",
          "storage": "file",
          "retentionPolicy": "limits",
          "discardPolicy": "old",
          "messageTTL": 1209600,
          "duplicateTrackingTime": 86400,
          "replication": 1,
          "rollUps": true
        }
      ]
    }
  }
}

```

В данном примере ответ метода `CreatePayment` ссылается на определение `ErrorResponse`, что позволяет избежать повторения структуры объекта.

### Генерируемые Файлы NSC-CLI

После успешной валидации схемы, **NSC-CLI** генерирует несколько важных файлов для создания нового сервиса. Ниже приведен список генерируемых файлов и их назначение:

1. **Базовые Файлы Сервиса**:
    - `service.ts`: Основной файл сервиса.
    - `package.json`: Файл конфигурации npm пакета.

2. **Методы Сервиса**:
    - `methods/Sum.ts`: Реализация метода `Sum`.
    - `methods/Fibonacci.ts`: Реализация метода `Fibonacci`.
    - `methods/SumStream.ts`: Реализация метода `SumStream`.

3. **Конфигурационные Файлы**:
    - `tsconfig.json`: Файл конфигурации TypeScript (если не существует).

4. **Файлы Интерфейсов и Типов**:
    - `interfaces.ts`: TypeScript интерфейсы, определяющие структуру запросов и ответов.

5. **Файлы Серверной Настройки**:
    - `server.ts`: Конфигурация и настройка сервера.

> **Примечание**: Точная структура и наименование генерируемых файлов могут варьироваться в зависимости от конвенций проекта и конкретных деталей реализации **NSC-CLI**.

            "description": "Кол-во сущностей"
          }
        },
        "required": ["page", "size", "total"]
      },
      "PaymentCallback": {
        "type": "object",
        "properties": {
          "event": {
            "type": "string",
            "enum": ["payment.waiting_for_capture", "payment.succeeded", "payment.canceled", "refund.succeeded"],
            "description": "Событие, например, 'payment.succeeded' или 'payment.canceled'."
          },
          "object": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string",
                "description": "Уникальный идентификатор платежа в системе ЮKassa."
              },
              "status": {
                "type": "string",
                "description": "Статус платежа, например, 'succeeded' или 'canceled'."
              },
              "amount": {
                "type": "object",
                "properties": {
                  "value": {
                    "type": "string",
                    "description": "Сумма платежа в виде строки для поддержки формата денежных значений."
                  },
                  "currency": {
                    "type": "string",
                    "description": "Валюта платежа, например, 'RUB'."
                  }
                },
                "required": ["value", "currency"],
                "additionalProperties": false
              },
              "created_at": {
                "type": "string",
                "format": "date-time",
                "description": "Дата и время создания платежа в формате ISO 8601."
              },
              "description": {
                "type": "string",
                "description": "Описание платежа, если указано.",
                "nullable": true
              },
              "payment_method": {
                "type": "object",
                "properties": {
                  "type": {
                    "type": "string",
                    "description": "Тип метода оплаты, например, 'bank_card'."
                  },
                  "id": {
                    "type": "string",
                    "description": "Идентификатор метода оплаты."
                  },
                  "saved": {
                    "type": "boolean",
                    "description": "Флаг, указывающий, сохранен ли метод оплаты."
                  },
                  "card": {
                    "type": "object",
                    "properties": {
                      "first6": {
                        "type": "string",
                        "pattern": "^\\d{6}$",
                        "description": "Первые 6 цифр номера карты."
                      },
                      "last4": {
                        "type": "string",
                        "pattern": "^\\d{4}$",
                        "description": "Последние 4 цифры номера карты."
                      },
                      "expiry_month": {
                        "type": "string",
                        "pattern": "^(0[1-9]|1[0-2])$",
                        "description": "Месяц окончания срока действия карты."
                      },
                      "expiry_year": {
                        "type": "string",
                        "pattern": "^\\d{4}$",
                        "description": "Год окончания срока действия карты."
                      },
                      "card_type": {
                        "type": "string",
                        "description": "Тип карты, например, 'MasterCard'."
                      }
                    },
                    "required": ["first6", "last4", "expiry_month", "expiry_year", "card_type"],
                    "additionalProperties": false
                  }
                },
                "required": ["type", "id", "saved"],
                "additionalProperties": false
              },
              "refundable": {
                "type": "boolean",
                "description": "Возможность возврата платежа."
              },
              "test": {
                "type": "boolean",
                "description": "Флаг, указывающий, является ли платеж тестовым."
              },
              "metadata": {
                "type": "object",
                "description": "Дополнительные метаданные, если есть.",
                "additionalProperties": true,
                "nullable": true
              }
            },
            "required": ["id", "status", "amount", "created_at", "payment_method", "refundable", "test"],
            "additionalProperties": false
          }
        },
        "required": ["event", "object"]
      

## Поддержка

Если вы столкнулись с какими-либо проблемами или у вас есть вопросы относительно **NSC-Toolkit**, **NSC-CRUD** или **NSC-CLI**, не стесняйтесь открыть issue в [репозитории GitHub](https://github.com/lad-tech/nsc-toolkit/issues) или напрямую связаться с мейнтейнером.

