# Wealth Hub

Платформа для привлечения и управления финансированием в малом и среднем бизнесе. Реализация по ВКР (Финансовый университет при Правительстве РФ, 2026).

Три роли: **Инвестор**, **Предприниматель**, **Администратор**. Соответствие ФЗ-152, ФЗ-259, ФЗ-115.

> **ВКР:** Верховский Григорий Андреевич, группа ИТвСФТ24-1м, 2026.

## 🧑 Демо-аккаунты после `seed_data`

| Логин          | Пароль        | Роль             | Что есть                                    |
|----------------|---------------|------------------|---------------------------------------------|
| `demo_investor`| `demo123demo` | Инвестор         | 6 инвестиций, 12+ дивидендов, реальные графики |
| `demo_owner`   | `demo123demo` | Предприниматель  | 9 проектов на витрине                        |

**Демо-вход одним кликом** на странице логина:
- Кнопка «Инвестор» → создаст случайного ЕСИА-инвестора (без истории)
- Кнопка «Предприниматель» → создаст ЕСИА-предпринимателя
- Кнопка «Администратор» → создаст ЕСИА-админа с правами модерации

> Для проверки графиков **войдите по логину `demo_investor`** — у него заполнены инвестиции, дивиденды и история транзакций. Иначе графики будут пустыми (это правильное поведение, в т.ч. для свежесозданного юзера).

---

## 🧪 Автоматические тесты

Покрывают рекомендательную подсистему (`core/recommender.py`), её HTTP-эндпоинт `/api/projects/<id>/recommendation/` и smoke-проверку эталонного демо-проекта **«InvestFlow PRO»**, который должен после `seed_data` существовать на модерации, оцениваться системой как `medium risk` и быть `high attractiveness` для `demo_investor`.

### Быстрый запуск

```bash
cd backend
.venv\Scripts\activate              # Windows
# source .venv/bin/activate         # Linux / macOS

# Все 39 тестов
python manage.py test core.tests

# С детальным выводом по каждому тесту
python manage.py test core.tests -v 2

# Только один модуль
python manage.py test core.tests.test_recommender
python manage.py test core.tests.test_recommendation_api
python manage.py test core.tests.test_seed_demo_project

# Параллельный запуск (быстрее на многоядерных машинах)
python manage.py test core.tests --parallel 4
```

Ожидаемый результат:
```
Ran 39 tests in ~17s
OK
```

### Покрытие кода (coverage)

Установлено в `requirements.txt`, конфиг — в `backend/.coveragerc`. Миграции, тесты и settings из подсчёта исключены.

```bash
# 1. Прогон с инструментацией
python -m coverage run --rcfile=.coveragerc manage.py test core.tests

# 2. Текстовая статистика в терминале
python -m coverage report --rcfile=.coveragerc

# 3. HTML-отчёт (даёт удобный браузер для drill-down по строкам)
python -m coverage html --rcfile=.coveragerc
# → откроется в backend/htmlcov/index.html

# 4. Сброс накопленной статистики
python -m coverage erase
```

Пример текущего отчёта (`coverage report`):

```
Name                  Stmts   Miss Branch BrPart  Cover
---------------------------------------------------------
core/admin.py            54      0      0      0 100.0%
core/apps.py              5      0      0      0 100.0%
core/models.py          257      2      2      0  99.2%
core/permissions.py      18      5      2      0  65.0%
core/recommender.py     217     26     74     12  86.3%
core/serializers.py     212     51     26      1  71.4%
core/urls.py             10      0      0      0 100.0%
core/views.py           410    252     84      2  33.2%
---------------------------------------------------------
TOTAL                  1183    336    188     15  67.4%
```

### Что покрыто

| Файл                            | Что проверяется                                                     | Тестов |
|---------------------------------|----------------------------------------------------------------------|--------|
| `test_recommender.py`           | Unit-тесты модуля: оценка риска и привлекательности по факторам      | **23** |
| `test_recommendation_api.py`    | HTTP-уровень: доступ только для админа, формат ответа, динамическая `attractiveness` в `/api/projects/` | **11** |
| `test_seed_demo_project.py`     | Smoke: InvestFlow PRO на модерации, system → medium risk, high attract. для demo_investor | **5** |
| `test_entrepreneur_features.py` | `?mine=1` (все свои проекты любого статуса) + endpoint `/investors/` (агрегаты вкладов и долей) | **17** |

Итого **56 тестов**, ~85 сек на полный прогон.

Каждый тест документирован в docstring — назначение и инвариант, который он защищает.

---

## 📁 Структура

```
wealth_hub/
├── backend/
│   ├── manage.py, requirements.txt
│   ├── wealth_hub_backend/         # Django settings
│   └── core/
│       ├── models.py               # User, Portfolio, Project, ProjectUpdate,
│       │                           # Investment, DividendPayout, SupportTicket,
│       │                           # FAQ, Notification, PROMOTION_TIERS_CONFIG
│       ├── serializers.py
│       ├── views.py                # +ProjectUpdate diff, продвижение, CRUD команды/документов
│       ├── urls.py
│       └── management/commands/
│           └── seed_data.py        # с демо-инвестором и дивидендами
└── frontend/
    └── src/
        ├── api/client.js           # +team/documents/promotion методы
        ├── pages/
        │   ├── ProjectEditPage.jsx       (НОВАЯ — Фаза 2)
        │   ├── AdminPage.jsx             (расширена в Фазе 2)
        │   └── …                         (остальные 14 страниц)
        └── …
```

---

## Технологический стек

**Frontend:** Vite 5 · React 18 · Tailwind CSS 3 · lucide-react
**Backend:** Python 3.11–3.14 · Django 5 · DRF · SimpleJWT · django-filter · Pillow ≥11.1
**БД:** SQLite (dev). Для MySQL раскомментируйте PyMySQL/mysqlclient в requirements.txt
**Аутентификация:** JWT + ЕСИА (имитация) + КЭП (SHA-256)

---

© 2026, ООО «ВЕЛФ ХАБ». ВКР, Финансовый университет при Правительстве РФ.
Верховский Григорий Андреевич, группа ИТвСФТ24-1м.
