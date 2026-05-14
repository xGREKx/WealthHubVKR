"""
python manage.py seed_data           — заполнить стартовыми данными
python manage.py seed_data --reset   — удалить старые проекты/инвестиции и пересоздать

Создаются три демо-аккаунта с фиксированными ESIA-UID, под которые входят
демо-кнопки на странице логина: demo_investor, demo_owner, demo_admin.
"""
from datetime import timedelta
from decimal import Decimal
import random

from django.core.management.base import BaseCommand
from django.utils import timezone

from core.models import (
    User, Portfolio, Project, TeamMember, Document, Investment, DividendPayout,
    FAQEntry, Transaction,
)


PROJECTS_DATA = [
    {
        'name': 'Финансовая грамотность',
        'slogan': 'Финансовая свобода начинается здесь',
        'description': 'Образовательная платформа для повышения финансовой грамотности населения. Курсы, симуляторы, гид по инвестициям и налогам.',
        'industry': 'education', 'type': 'startup', 'geography': 'Москва',
        'goal': 4_000_000, 'raised': 1_567_006, 'min_investment': 25_000,
        'expected_return': 22, 'payback_years': 3, 'days_left': 100,
        'risk': 'low', 'attractiveness': 'medium', 'promoted': True, 'tier': 'main',
        'team': [
            ('Анна Соколова', 'CEO', '10 лет в EdTech, экс-Skyeng'),
            ('Игорь Морозов', 'CFO', 'CFA, 8 лет в инвестбанкинге'),
        ],
    },
    {
        'name': 'MoneyWise',
        'slogan': 'Управляй деньгами как профессионал',
        'description': 'Мобильное приложение для управления личными финансами с AI-аналитикой расходов.',
        'industry': 'fintech', 'type': 'expanding', 'geography': 'Санкт-Петербург',
        'goal': 20_000_000, 'raised': 11_767_806, 'min_investment': 100_000,
        'expected_return': 26, 'payback_years': 4, 'days_left': 70,
        'risk': 'low', 'attractiveness': 'medium', 'promoted': True, 'tier': 'highlight',
        'team': [
            ('Михаил Орлов',    'CEO', 'Серийный предприниматель, 2 экзита'),
            ('Светлана Ершова', 'CTO', 'Ex-Тинькофф'),
        ],
    },
    {
        'name': 'FinPulse',
        'slogan': 'Чувствуй ритм своих финансов',
        'description': 'Аналитический сервис для малого бизнеса: cash-flow в реальном времени, интеграция с банками.',
        'industry': 'fintech', 'type': 'expanding', 'geography': 'Казань',
        'goal': 6_000_000, 'raised': 5_584_000, 'min_investment': 50_000,
        'expected_return': 24, 'payback_years': 3, 'days_left': 50,
        'risk': 'low', 'attractiveness': 'medium', 'promoted': True, 'tier': 'main',
        'team': [('Артём Беляев', 'CEO', '7 лет в финтехе')],
    },
    {
        'name': 'ЭкоПак Био',
        'slogan': 'Биоразлагаемая упаковка нового поколения',
        'description': 'Производство компостируемой упаковки из агроотходов. Контракты с тремя федеральными сетями.',
        'industry': 'ecology', 'type': 'startup', 'geography': 'Москва',
        'goal': 15_000_000, 'raised': 9_750_000, 'min_investment': 50_000,
        'expected_return': 28, 'payback_years': 3, 'days_left': 23,
        'risk': 'medium', 'attractiveness': 'high', 'promoted': True, 'tier': 'highlight',
        'team': [('Ксения Гаврилова', 'CEO', 'PhD химия, МГУ')],
    },
    {
        'name': 'МедТех ИИ',
        'slogan': 'Раннее обнаружение онкологии с помощью ИИ',
        'description': 'Программный комплекс для радиологов: разметка КТ-снимков, выявление узлов на ранней стадии.',
        'industry': 'healthcare', 'type': 'expanding', 'geography': 'Новосибирск',
        'goal': 30_000_000, 'raised': 19_200_000, 'min_investment': 250_000,
        'expected_return': 32, 'payback_years': 4, 'days_left': 47,
        'risk': 'medium', 'attractiveness': 'high', 'promoted': False, 'tier': '',
        'team': [('Виктор Зайцев', 'CEO', 'Ex-Yandex Health')],
    },
    {
        'name': 'AgriChain',
        'slogan': 'Прослеживаемость продуктов от поля до полки',
        'description': 'Блокчейн-платформа для агрохолдингов и ритейла.',
        'industry': 'it', 'type': 'startup', 'geography': 'Краснодар',
        'goal': 12_000_000, 'raised': 4_320_000, 'min_investment': 100_000,
        'expected_return': 30, 'payback_years': 3, 'days_left': 62,
        'risk': 'high', 'attractiveness': 'medium', 'promoted': False, 'tier': '',
        'team': [('Тимур Каримов', 'CEO', 'Технологический предприниматель')],
    },
    {
        'name': 'Уральский Станкозавод',
        'slogan': 'Импортозамещение в высокоточной обработке',
        'description': 'Модернизация производства фрезерных станков с ЧПУ. Контракты ОПК.',
        'industry': 'manufacturing', 'type': 'mature', 'geography': 'Екатеринбург',
        'goal': 50_000_000, 'raised': 38_500_000, 'min_investment': 500_000,
        'expected_return': 19, 'payback_years': 5, 'days_left': 31,
        'risk': 'low', 'attractiveness': 'high', 'promoted': True, 'tier': 'main',
        'team': [('Геннадий Пермяков', 'Гендиректор', '22 года в станкостроении')],
    },
    {
        'name': 'EduFlow',
        'slogan': 'Адаптивные курсы для школ',
        'description': 'LMS-платформа с адаптивными траекториями.',
        'industry': 'education', 'type': 'startup', 'geography': 'Казань',
        'goal': 8_000_000, 'raised': 2_100_000, 'min_investment': 25_000,
        'expected_return': 24, 'payback_years': 4, 'days_left': 88,
        'risk': 'medium', 'attractiveness': 'medium', 'promoted': False, 'tier': '',
        'team': [('Ринат Сафин', 'CEO', 'Преподаватель')],
    },
    {
        'name': 'CraftHub',
        'slogan': 'Маркетплейс российских ремесленников',
        'description': 'Маркетплейс изделий ручной работы со встроенной логистикой.',
        'industry': 'retail', 'type': 'crowdfunding', 'geography': 'Санкт-Петербург',
        'goal': 3_500_000, 'raised': 1_890_000, 'min_investment': 10_000,
        'expected_return': 21, 'payback_years': 3, 'days_left': 41,
        'risk': 'medium', 'attractiveness': 'medium', 'promoted': False, 'tier': '',
        'team': [('Лидия Зорина', 'CEO', '10 лет в e-commerce')],
    },
]


FAQ_DATA = [
    ('general',    'Что такое Wealth Hub?',                      'Wealth Hub — инвестиционная платформа для финансирования малого и среднего бизнеса, соответствующая ФЗ-259. Мы соединяем предпринимателей, ищущих финансирование, и инвесторов, желающих вложить капитал в проверенные проекты.'),
    ('general',    'Кто может стать инвестором?',                'Инвестором может стать любой совершеннолетний гражданин РФ, прошедший подтверждение личности через Госуслуги или ручную модерацию.'),
    ('investment', 'Как происходит инвестирование?',             'Выберите проект на витрине, нажмите «Инвестировать», подтвердите сумму и согласие с риск-декларацией. Сделка подписывается квалифицированной электронной подписью, средства поступают на эскроу-счёт.'),
    ('investment', 'Что такое эскроу-счёт?',                     'Эскроу — это специальный счёт условного хранения. Деньги на нём заблокированы до момента, когда проект соберёт всю необходимую сумму. Если этого не происходит — средства возвращаются инвестору.'),
    ('investment', 'Можно ли продать свою долю?',                'Да, через раздел «Управление финансами → Продать свою долю». Учтите, что продажа возможна только при наличии покупателя и сопровождается комиссией платформы.'),
    ('payment',    'Какие комиссии берёт платформа?',            'Платформа удерживает 2% комиссии при инвестировании и 13% НДФЛ с полученного дохода (для резидентов РФ).'),
    ('payment',    'Как пополнить баланс?',                      'Через раздел «Личный кабинет → Пополнить» можно перевести средства с банковской карты, через СБП или банковским переводом.'),
    ('payment',    'Как вывести средства?',                      'В разделе «Управление финансами → Вывести средства» укажите реквизиты банковского счёта. Срок зачисления — 1-3 рабочих дня.'),
    ('account',    'Зачем нужно подтверждение через Госуслуги?', 'В соответствии с ФЗ-115 (противодействие легализации) и ФЗ-259, инвестиционная платформа обязана идентифицировать всех своих клиентов. Подтверждение через Госуслуги — самый быстрый способ.'),
    ('security',   'Насколько защищены мои средства?',           'Все транзакции проходят через эскроу-счета аккредитованных банков, сделки подписываются КЭП. Платформа не имеет доступа к вашим средствам.'),
    ('security',   'Что делать при подозрении на мошенничество?', 'Немедленно обратитесь в службу поддержки через раздел «Обращения» или напишите на support@wealthhub.ru.'),
]


# Сценарий тестовых инвестиций для demo_investor.
# Распределение по риск-классам и срокам — чтобы графики выглядели реалистично.
DEMO_INVESTMENTS = [
    # (название проекта, сумма, месяцев назад)
    # Профиль demo_investor: предпочитает fintech и проекты среднего риска,
    # средняя доходность портфеля ~25%. Эти инвестиции нужны и для графиков
    # аналитики, и для того, чтобы рекомендательная подсистема имела
    # содержательный профиль (cold-start не сработает).
    ('Уральский Станкозавод',  500_000,  12),  # manufacturing, low,  19%
    ('Финансовая грамотность',  100_000,  10),  # education,     low,  22%
    ('FinPulse',                250_000,  9),   # fintech,       low,  24%
    ('MoneyWise',               200_000,  8),   # fintech,       low,  26% — усиливает интерес к fintech
    ('ЭкоПак Био',              150_000,  7),   # ecology,       med,  28%
    ('МедТех ИИ',               300_000,  5),   # healthcare,    med,  32%
    ('AgriChain',               100_000,  3),   # agriculture,   high, 30% — самая свежая
]


def force_created_at(model, instance_id, dt):
    """Перезаписывает auto_now_add — для тестовых данных в прошлом."""
    model.objects.filter(id=instance_id).update(created_at=dt)


class Command(BaseCommand):
    help = 'Заполнить БД стартовыми данными'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true', help='Удалить старые данные перед заливкой')

    def handle(self, *args, **options):
        if options['reset']:
            self.stdout.write('Удаление старых данных...')
            Investment.objects.all().delete()
            Transaction.objects.all().delete()
            DividendPayout.objects.all().delete()
            Project.objects.all().delete()
            FAQEntry.objects.all().delete()
            # Также удалим демо-юзеров для чистого пересоздания
            User.objects.filter(username__in=['demo_owner', 'demo_investor', 'demo_admin']).delete()
            User.objects.filter(esia_uid__in=['demo_owner', 'demo_investor', 'demo_admin']).delete()

        # ===========================================================
        # Демо-владелец проектов (предприниматель)
        # ===========================================================
        owner = self._create_demo_user(
            username='demo_owner', esia_uid='demo_owner',
            role=User.Role.ENTREPRENEUR,
            first='Екатерина', last='Морозова', middle='Дмитриевна',
            email='owner@wealthhub.local',
        )

        # ===========================================================
        # Проекты
        # ===========================================================
        self.stdout.write('Создание проектов...')
        project_map = {}
        for data in PROJECTS_DATA:
            project, _ = Project.objects.update_or_create(
                name=data['name'],
                defaults={
                    'owner': owner,
                    'slogan': data['slogan'], 'description': data['description'],
                    'industry': data['industry'], 'type': data['type'],
                    'geography': data['geography'],
                    'goal': Decimal(str(data['goal'])),
                    'raised': Decimal(str(data['raised'])),
                    'min_investment': Decimal(str(data['min_investment'])),
                    'expected_return': Decimal(str(data['expected_return'])),
                    'payback_years': data['payback_years'],
                    'closing_date': timezone.now().date() + timedelta(days=data['days_left']),
                    'risk': data['risk'], 'attractiveness': data['attractiveness'],
                    'status': Project.Status.ACTIVE,
                    'promoted': data['promoted'], 'promotion_tier': data['tier'],
                }
            )
            project.team.all().delete()
            for name, role, bio in data['team']:
                TeamMember.objects.create(project=project, name=name, role=role, bio=bio)
            project_map[data['name']] = project
            self.stdout.write(f'  ✓ {project.name}')

        # ===========================================================
        # ЭТАЛОННЫЙ ПРОЕКТ НА МОДЕРАЦИИ
        # ===========================================================
        # Тщательно прописанный проект, который:
        #   • рекомендательная подсистема предложит как «средний риск»
        #     (умеренная доходность 26%, окупаемость 3 года, тип expanding,
        #      сильная команда, 3 документа, разумный минимум входа);
        #   • будет «высоко привлекательным» для demo_investor: его топ-отрасль —
        #     fintech (FinPulse, MoneyWise), любимый риск — medium, средняя
        #     доходность по портфелю ~25%, доступный баланс >> минимума.
        self.stdout.write('Создание эталонного проекта на модерации...')
        pending_project, _ = Project.objects.update_or_create(
            name='InvestFlow PRO',
            defaults={
                'owner': owner,
                'slogan': 'Платформа для управления портфелями в семейных офисах',
                'description': (
                    'B2B SaaS-решение для квалифицированных инвесторов, семейных '
                    'офисов и независимых финансовых консультантов. Объединяет '
                    'учёт активов из 20+ источников (брокерские счета, ИИС, '
                    'крипто-кошельки, недвижимость), автоматический расчёт '
                    'налогооблагаемой базы по 18 категориям и формирование '
                    'отчётов для ФНС в один клик.'
                ),
                'full_content': (
                    '<h3>Проблема</h3>'
                    '<p>Квалифицированные инвесторы и семейные офисы в России '
                    'управляют активами в среднем через 5–7 различных сервисов '
                    '(брокер, банк, ИИС, крипто-биржа, фонды, недвижимость, '
                    'венчурные доли). Консолидация портфеля занимает 8–14 часов '
                    'в месяц на одного клиента; декларирование 3-НДФЛ — ещё 4–6 '
                    'часов в год. Существующие решения (Intelinvest, '
                    'snowball.income) покрывают только биржевые активы и не '
                    'умеют работать с венчуром и недвижимостью.</p>'
                    '<h3>Решение</h3>'
                    '<p>InvestFlow PRO — единая панель управления, которая '
                    'автоматически подтягивает данные через API брокеров и '
                    'банков (Тинькофф, ВТБ, БКС, Альфа), считает доходность '
                    'портфеля по методу TWR/MWR, налоговые последствия по '
                    'каждой сделке и формирует ежемесячные отчёты для '
                    'бенефициаров. Реализован конструктор стратегий '
                    'ребалансировки и алёрты по рыночным событиям.</p>'
                    '<h3>Текущая стадия</h3>'
                    '<p>Продукт прошёл закрытое бета-тестирование с 18 '
                    'клиентами (3 семейных офиса, 12 квалифицированных '
                    'инвесторов, 3 финансовых консультанта). Подтверждено '
                    'снижение операционных трат на учёт портфеля в 4–6 раз. '
                    'MRR на конец Q1 2026 — 2,3 млн ₽, retention 12 мес. — 94%.</p>'
                    '<h3>Использование инвестиций</h3>'
                    '<p><b>40%</b> — найм команды разработки (3 senior + 1 '
                    'product-аналитик).<br>'
                    '<b>25%</b> — интеграции с банками-партнёрами по API.<br>'
                    '<b>20%</b> — performance-маркетинг для расширения базы '
                    'квалифицированных инвесторов.<br>'
                    '<b>15%</b> — операционные расходы (юридическое '
                    'сопровождение лицензий, инфраструктура).</p>'
                    '<h3>План выхода и доходность</h3>'
                    '<p>Целевой ARR через 24 месяца — 84 млн ₽ (350 платящих '
                    'клиентов × 20 тыс. ₽/мес средний чек). Выход для '
                    'инвесторов через выкуп долей основателями или M&A в '
                    'индустрии финансовых сервисов. Прогнозная доходность '
                    'для инвестора — 26% годовых при сроке окупаемости '
                    '3 года.</p>'
                ),
                'industry': Project.Industry.FINTECH,
                'type':     Project.Type.EXPANDING,
                'geography': 'Москва',
                'goal':            Decimal('15000000'),
                'raised':          Decimal('0'),
                'min_investment':  Decimal('100000'),
                'expected_return': Decimal('26'),
                'payback_years':   3,
                'closing_date':    timezone.now().date() + timedelta(days=120),
                # Поля risk/attractiveness оставляем пустыми (blank), чтобы их
                # предложила рекомендательная подсистема при модерации
                'risk':           '',
                'attractiveness': '',
                'status':         Project.Status.PENDING,
                'promoted':       False,
                'promotion_tier': '',
            }
        )

        # Команда — 4 человека с сильным бэкграундом
        pending_project.team.all().delete()
        TeamMember.objects.bulk_create([
            TeamMember(project=pending_project, name='Дмитрий Левченко',
                       role='CEO и сооснователь',
                       bio='10 лет в управлении активами. Ex-БКС Wealth Management, '
                           'управлял портфелями HNWI на 4,5 млрд ₽. CFA, ФИНАМ-Pro.'),
            TeamMember(project=pending_project, name='Мария Гончарова',
                       role='CTO и сооснователь',
                       bio='8 лет в финтех-разработке. Ex-Тинькофф Инвестиции, '
                           'тимлид направления API брокера. Профильное образование '
                           'МФТИ, прикладная математика и информатика.'),
            TeamMember(project=pending_project, name='Сергей Власов',
                       role='Head of Product',
                       bio='6 лет в продакт-менеджменте B2B SaaS. Ex-Контур, '
                           'выстраивал линейку для бухгалтеров. Запустил два '
                           'продукта от 0 до ARR 50 млн ₽.'),
            TeamMember(project=pending_project, name='Ольга Ткаченко',
                       role='Head of Compliance',
                       bio='12 лет в банковском комплаенсе. Ex-Сбер CIB, '
                           'отвечала за работу с квалифицированными инвесторами '
                           'и интеграции с ЦБ. Аккредитованный аудитор.'),
        ])

        # Документы — 3 штуки. Файлов реально нет, но в seed-данных хранится
        # только метаинформация (имя, тип, размер) — этого достаточно, чтобы
        # рекомендатель насчитал баллы за полноту документации.
        pending_project.documents.all().delete()
        Document.objects.bulk_create([
            Document(project=pending_project,
                     name='InvestFlow PRO — бизнес-план.pdf',
                     type=Document.Type.BUSINESS_PLAN, size_bytes=2_847_000),
            Document(project=pending_project,
                     name='InvestFlow PRO — финансовая модель.xlsx',
                     type=Document.Type.FINANCIAL_MODEL, size_bytes=1_204_000),
            Document(project=pending_project,
                     name='InvestFlow PRO — питч-дек.pdf',
                     type=Document.Type.PRESENTATION, size_bytes=4_512_000),
        ])

        self.stdout.write(f'  ✓ {pending_project.name} (на модерации)')
        project_map[pending_project.name] = pending_project

        # ===========================================================
        # FAQ
        # ===========================================================
        self.stdout.write('Создание FAQ...')
        for i, (cat, q, a) in enumerate(FAQ_DATA):
            FAQEntry.objects.update_or_create(
                question=q,
                defaults={'category': cat, 'answer': a, 'order': i, 'is_published': True}
            )
        self.stdout.write(f'  ✓ {len(FAQ_DATA)} вопросов')

        # ===========================================================
        # Демо-инвестор с историей
        # ===========================================================
        self.stdout.write('Создание demo_investor с историей...')
        investor = self._create_demo_user(
            username='demo_investor', esia_uid='demo_investor',
            role=User.Role.INVESTOR,
            first='Алексей', last='Иванов', middle='Сергеевич',
            email='investor@wealthhub.local',
        )

        # Чистый портфель
        Investment.objects.filter(investor=investor).delete()
        Transaction.objects.filter(user=investor).delete()

        portfolio, _ = Portfolio.objects.get_or_create(user=investor)
        portfolio.balance   = Decimal('5000000')
        portfolio.invested  = Decimal('0')
        portfolio.dividends = Decimal('0')
        portfolio.save()

        now = timezone.now()

        # Несколько пополнений в начале — чтобы линия "Доходы" выросла
        for offset_days in [365, 270, 200]:
            tx = Transaction.objects.create(
                user=investor, type=Transaction.Type.DEPOSIT,
                amount=Decimal('500000'), status=Transaction.Status.COMPLETED,
            )
            force_created_at(Transaction, tx.id, now - timedelta(days=offset_days))

        total_invested  = Decimal('0')
        total_dividends = Decimal('0')

        for project_name, amount, months_ago in DEMO_INVESTMENTS:
            project = project_map.get(project_name)
            if not project:
                continue
            amt = Decimal(str(amount))
            invested_at = now - timedelta(days=months_ago * 30)

            # Создаём инвестицию
            inv = Investment.objects.create(
                investor=investor, project=project,
                amount=amt,
                share_percent=(amt / project.goal) * 100,
                risk_at_purchase=project.risk,
                risk_disclaimer_accepted=True,
                signature_hash=f'demo_{project.id.hex[:16]}',
                escrow_account=f'40817810{random.randint(10**11, 10**12-1)}',
            )
            Investment.objects.filter(id=inv.id).update(created_at=invested_at)

            # Транзакция инвестирования
            tx = Transaction.objects.create(
                user=investor, type=Transaction.Type.INVESTMENT,
                amount=amt, status=Transaction.Status.COMPLETED,
                investment=inv, escrow_account=inv.escrow_account,
            )
            force_created_at(Transaction, tx.id, invested_at)
            total_invested += amt

            # Квартальные дивидендные выплаты
            quarterly_amount = (amt * Decimal(str(project.expected_return))
                                / Decimal('100') / Decimal('4')).quantize(Decimal('0.01'))

            current = invested_at + timedelta(days=90)
            while current < now:
                payout = DividendPayout.objects.create(
                    investment=inv,
                    amount=quarterly_amount,
                    paid_at=current,
                    is_paid=True,
                    note=f'Квартальная выплата по проекту «{project.name}»',
                )
                total_dividends += quarterly_amount

                # Транзакция дивиденда
                div_tx = Transaction.objects.create(
                    user=investor, type=Transaction.Type.DIVIDEND,
                    amount=quarterly_amount, status=Transaction.Status.COMPLETED,
                    investment=inv,
                )
                force_created_at(Transaction, div_tx.id, current)

                current += timedelta(days=90)

            # И две будущие выплаты — для таймлайна "Ближайшие выплаты"
            for delta_days in [30, 120]:
                future_at = now + timedelta(days=delta_days)
                DividendPayout.objects.create(
                    investment=inv,
                    amount=quarterly_amount,
                    paid_at=future_at,
                    is_paid=False,
                    note=f'Запланированная выплата по проекту «{project.name}»',
                )

            self.stdout.write(f'  ✓ {project.name}: {amt} ₽ ({months_ago} мес. назад)')

        # Один вывод средств (чтобы был кейс расхода в "Финансах")
        withdraw_tx = Transaction.objects.create(
            user=investor, type=Transaction.Type.WITHDRAWAL,
            amount=Decimal('200000'), status=Transaction.Status.COMPLETED,
        )
        force_created_at(Transaction, withdraw_tx.id, now - timedelta(days=60))

        # Обновляем портфель
        # Стартовый баланс 5М + три депозита по 500к = 6.5М. Минус инвестиции, минус вывод, плюс дивиденды.
        portfolio.balance   = (Decimal('5000000') + Decimal('1500000')
                              - total_invested - Decimal('200000') + total_dividends)
        portfolio.invested  = total_invested
        portfolio.dividends = total_dividends
        portfolio.save()

        # ===========================================================
        # Демо-администратор
        # ===========================================================
        self.stdout.write('Создание demo_admin...')
        admin = self._create_demo_user(
            username='demo_admin', esia_uid='demo_admin',
            role=User.Role.ADMIN,
            first='Анна', last='Волкова', middle='Александровна',
            email='admin@wealthhub.local',
            is_staff=True, is_superuser=True,
        )

        # ===========================================================
        # Готово
        # ===========================================================
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('Готово!'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write('')
        self.stdout.write('Демо-аккаунты:')
        self.stdout.write('  ИНВЕСТОР        логин: demo_investor   пароль: demo123demo')
        self.stdout.write('  ПРЕДПРИНИМАТЕЛЬ логин: demo_owner       пароль: demo123demo')
        self.stdout.write('  АДМИНИСТРАТОР   логин: demo_admin       пароль: demo123demo')
        self.stdout.write('')
        self.stdout.write('  Также можно нажать «Инвестор / Предприниматель / Администратор»')
        self.stdout.write('  на странице логина — вход через ЕСИА под этими же аккаунтами.')
        self.stdout.write('')
        self.stdout.write(f'  У demo_investor: {len(DEMO_INVESTMENTS)} инвестиций, '
                         f'дивидендов на {total_dividends:.0f} ₽')
        self.stdout.write('')

    def _create_demo_user(self, username, esia_uid, role, first, last, middle, email,
                         is_staff=False, is_superuser=False):
        """Создаёт или обновляет демо-пользователя."""
        user, created = User.objects.update_or_create(
            username=username,
            defaults={
                'esia_uid': esia_uid,
                'role': role,
                'first_name_ru': first, 'last_name_ru': last, 'middle_name_ru': middle,
                'email': email,
                'verification_status': User.VerificationStatus.VERIFIED_ESIA,
                'registered_via_esia': True,
                'e_signature_status': User.ESignatureStatus.VERIFIED,
                'is_staff': is_staff, 'is_superuser': is_superuser,
            }
        )
        # Пароль ставим всегда (на случай если в --reset потерлись пользователи)
        user.set_password('demo123demo')
        user.save()
        Portfolio.objects.get_or_create(user=user, defaults={'balance': Decimal('5000000')})
        return user
