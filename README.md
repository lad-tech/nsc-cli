# Генерация нового сервиса по схеме. Создана для быстрой генерации сервисов с использованием [nsc-toolkit](https://github.com/lad-tech/nsc-toolkit)

## Возможности

* Валидация схемы
* Генерация базового содержания сервиса
* Уже сгенерированные методы изменяться не будут, только интерфейсы
* Можно в корень сервиса положить .nscignore (синтаксис gitignore) и нужные вам файлы не будут перезаписаны

## Установка

```bash
npm i @lad-tech/nsc-cli -D

```

### Пример использования

```bash 
npx nsc-cli --schema ./services/myService/service.json     
```

### Опции

```bash

npx nsc-cli -h 

Usage: nsc-cli [options]

Генерация нового сервиса по json schema

Options:
  --schema  <path>  путь до схемы
  -h, --help        display help for command




```

### Применение .nscignore

```gitignore

**/service.ts
**/package.json

```

### Схема описания сервиса ([подробности](https://github.com/lad-tech/nsc-toolkit))

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



