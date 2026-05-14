"""
Модели Wealth Hub.
"""
import uuid
import secrets
from django.db import models
from django.contrib.auth.models import AbstractUser


# ============================================================================
# ПОЛЬЗОВАТЕЛЬ
# ============================================================================
class User(AbstractUser):
    class Role(models.TextChoices):
        INVESTOR     = 'investor',     'Инвестор'
        ENTREPRENEUR = 'entrepreneur', 'Предприниматель'
        ADMIN        = 'admin',        'Администратор'

    class ESignatureStatus(models.TextChoices):
        NONE     = 'none',     'Не оформлена'
        PENDING  = 'pending',  'На проверке'
        VERIFIED = 'verified', 'Подтверждена'

    class VerificationStatus(models.TextChoices):
        NOT_VERIFIED    = 'not_verified',    'Не подтверждён'
        PENDING         = 'pending',         'На проверке'
        VERIFIED_ESIA   = 'verified_esia',   'Подтверждён через Госуслуги'
        VERIFIED_MANUAL = 'verified_manual', 'Подтверждён вручную'

    role = models.CharField(max_length=16, choices=Role.choices, default=Role.INVESTOR)

    last_name_ru   = models.CharField('Фамилия',   max_length=64,  blank=True)
    first_name_ru  = models.CharField('Имя',       max_length=64,  blank=True)
    middle_name_ru = models.CharField('Отчество',  max_length=64,  blank=True)
    inn            = models.CharField('ИНН',       max_length=12,  blank=True)
    passport       = models.CharField('Паспорт',   max_length=32,  blank=True)
    phone          = models.CharField('Телефон',   max_length=24,  blank=True)
    avatar         = models.ImageField(upload_to='avatars/%Y/%m/', blank=True, null=True)

    esia_uid            = models.CharField('Идентификатор ЕСИА', max_length=64, blank=True, db_index=True)
    registered_via_esia = models.BooleanField('Зарегистрирован через ЕСИА', default=False)

    e_signature_status  = models.CharField(max_length=16, choices=ESignatureStatus.choices,  default=ESignatureStatus.NONE)
    verification_status = models.CharField(max_length=20, choices=VerificationStatus.choices, default=VerificationStatus.NOT_VERIFIED)

    api_token          = models.CharField('API-токен', max_length=64, blank=True, unique=True)
    two_factor_enabled = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'

    def save(self, *args, **kwargs):
        if not self.api_token:
            self.api_token = f'wh_live_{secrets.token_urlsafe(24)}'
        super().save(*args, **kwargs)

    @property
    def full_name_ru(self):
        return f'{self.last_name_ru} {self.first_name_ru} {self.middle_name_ru}'.strip()

    @property
    def can_invest(self):
        return self.verification_status in (
            self.VerificationStatus.VERIFIED_ESIA,
            self.VerificationStatus.VERIFIED_MANUAL,
        )


# ============================================================================
# ПОРТФЕЛЬ
# ============================================================================
class Portfolio(models.Model):
    user      = models.OneToOneField(User, on_delete=models.CASCADE, related_name='portfolio')
    balance   = models.DecimalField('Баланс',     max_digits=14, decimal_places=2, default=0)
    invested  = models.DecimalField('Вложено',    max_digits=14, decimal_places=2, default=0)
    dividends = models.DecimalField('Дивиденды',  max_digits=14, decimal_places=2, default=0)

    class Meta:
        verbose_name = 'Портфель'
        verbose_name_plural = 'Портфели'

    def __str__(self):
        return f'Портфель {self.user.username}'


# ============================================================================
# ПРОЕКТ
# ============================================================================
class Project(models.Model):
    class Industry(models.TextChoices):
        IT            = 'it',            'IT и технологии'
        FINTECH       = 'fintech',       'Финтех'
        HEALTHCARE    = 'healthcare',    'Здравоохранение'
        EDUCATION     = 'education',     'Образование'
        ECOLOGY       = 'ecology',       'Экология'
        MANUFACTURING = 'manufacturing', 'Производство'
        RETAIL        = 'retail',        'Ритейл'
        TOURISM       = 'tourism',       'Туризм'

    class Type(models.TextChoices):
        STARTUP      = 'startup',      'Стартап'
        EXPANDING    = 'expanding',    'Расширяющийся бизнес'
        MATURE       = 'mature',       'Зрелая компания'
        CROWDFUNDING = 'crowdfunding', 'Краудфандинг'
        TRADITIONAL  = 'traditional',  'Традиционный бизнес'

    class Risk(models.TextChoices):
        LOW    = 'low',    'Низкий'
        MEDIUM = 'medium', 'Средний'
        HIGH   = 'high',   'Высокий'

    class Attractiveness(models.TextChoices):
        LOW    = 'low',    'Низкая'
        MEDIUM = 'medium', 'Средняя'
        HIGH   = 'high',   'Высокая'

    class Status(models.TextChoices):
        DRAFT    = 'draft',    'Черновик'
        PENDING  = 'pending',  'На модерации'
        ACTIVE   = 'active',   'Активный'
        REJECTED = 'rejected', 'Отклонён'
        CLOSED   = 'closed',   'Закрыт'

    class PromotionTier(models.TextChoices):
        NONE      = '',          'Без продвижения'
        HIGHLIGHT = 'highlight', 'Подсветка карточки'
        TOP       = 'top',       'В топе витрины'
        MAIN      = 'main',      'На главной'

    id    = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='projects')

    name         = models.CharField('Название', max_length=128)
    slogan       = models.CharField('Слоган',   max_length=256, blank=True)
    description  = models.TextField('Краткое описание')
    full_content = models.TextField('Подробное содержание (HTML)', blank=True)
    cover_image  = models.ImageField('Обложка', upload_to='projects/%Y/%m/', blank=True, null=True)

    industry  = models.CharField(max_length=20, choices=Industry.choices)
    type      = models.CharField(max_length=20, choices=Type.choices)
    geography = models.CharField('География', max_length=64, blank=True)

    goal            = models.DecimalField('Цель сбора',    max_digits=14, decimal_places=2)
    raised          = models.DecimalField('Собрано',       max_digits=14, decimal_places=2, default=0)
    min_investment  = models.DecimalField('Минимум',       max_digits=14, decimal_places=2)
    expected_return = models.DecimalField('Доходность %',  max_digits=5,  decimal_places=2)
    payback_years   = models.PositiveSmallIntegerField('Окупаемость (лет)', default=3)
    closing_date    = models.DateField('Дата закрытия', null=True, blank=True)

    risk           = models.CharField(max_length=8,  choices=Risk.choices,           blank=True)
    attractiveness = models.CharField(max_length=8,  choices=Attractiveness.choices, blank=True)
    status         = models.CharField(max_length=10, choices=Status.choices,         default=Status.PENDING)
    promoted       = models.BooleanField('В продвижении', default=False)
    promotion_tier = models.CharField(max_length=20, choices=PromotionTier.choices, default=PromotionTier.NONE, blank=True)
    promotion_until = models.DateTimeField('Продвижение до', null=True, blank=True)

    moderator          = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='moderated_projects')
    moderation_comment = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Проект'
        verbose_name_plural = 'Проекты'
        ordering = ['-promoted', '-created_at']

    def __str__(self):
        return self.name


class TeamMember(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='team')
    name    = models.CharField(max_length=128)
    role    = models.CharField(max_length=64)
    bio     = models.TextField(blank=True)
    cv_file = models.FileField('CV в PDF', upload_to='cv/%Y/%m/', blank=True, null=True)


class Document(models.Model):
    class Type(models.TextChoices):
        BUSINESS_PLAN   = 'business_plan',   'Бизнес-план'
        FINANCIAL_MODEL = 'financial_model', 'Финансовая модель'
        PRESENTATION    = 'presentation',    'Презентация'
        OTHER           = 'other',           'Прочее'

    project    = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='documents')
    name       = models.CharField(max_length=256)
    type       = models.CharField(max_length=24, choices=Type.choices, default=Type.OTHER)
    file       = models.FileField(upload_to='documents/%Y/%m/')
    size_bytes = models.PositiveIntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)


class ProjectUpdate(models.Model):
    """История изменений проекта — для уведомлений инвесторам."""
    project    = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='updates')
    author     = models.ForeignKey(User,    on_delete=models.SET_NULL, null=True)
    summary    = models.CharField('Краткое описание изменений', max_length=500)
    details    = models.JSONField('Детали (что изменилось)', default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Обновление проекта'
        verbose_name_plural = 'Обновления проектов'


# ============================================================================
# ИНВЕСТИЦИИ И ТРАНЗАКЦИИ
# ============================================================================
class Investment(models.Model):
    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    investor      = models.ForeignKey(User,    on_delete=models.CASCADE, related_name='investments')
    project       = models.ForeignKey(Project, on_delete=models.PROTECT, related_name='investments')
    amount        = models.DecimalField(max_digits=14, decimal_places=2)
    share_percent = models.DecimalField(max_digits=6,  decimal_places=4)

    risk_at_purchase         = models.CharField(max_length=8, choices=Project.Risk.choices)
    risk_disclaimer_accepted = models.BooleanField(default=False)
    signature_hash           = models.CharField(max_length=64, blank=True)
    escrow_account           = models.CharField(max_length=32, blank=True)

    is_sold = models.BooleanField('Доля продана', default=False)
    sold_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Инвестиция'
        verbose_name_plural = 'Инвестиции'
        ordering = ['-created_at']


class DividendPayout(models.Model):
    investment = models.ForeignKey(Investment, on_delete=models.CASCADE, related_name='payouts')
    amount     = models.DecimalField(max_digits=14, decimal_places=2)
    paid_at    = models.DateTimeField()
    is_paid    = models.BooleanField(default=False)
    note       = models.CharField(max_length=256, blank=True)

    class Meta:
        ordering = ['paid_at']


class Transaction(models.Model):
    class Type(models.TextChoices):
        DEPOSIT    = 'deposit',    'Пополнение'
        WITHDRAWAL = 'withdrawal', 'Вывод средств'
        INVESTMENT = 'investment', 'Инвестирование'
        DIVIDEND   = 'dividend',   'Дивиденды'
        SALE       = 'sale',       'Продажа доли'
        PROMOTION  = 'promotion',  'Покупка продвижения'

    class Status(models.TextChoices):
        PENDING   = 'pending',   'В обработке'
        COMPLETED = 'completed', 'Завершено'
        FAILED    = 'failed',    'Ошибка'

    id      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user    = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transactions')
    type    = models.CharField(max_length=16, choices=Type.choices)
    amount  = models.DecimalField(max_digits=14, decimal_places=2)
    status  = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)

    investment     = models.ForeignKey(Investment, on_delete=models.SET_NULL, null=True, blank=True)
    escrow_account = models.CharField(max_length=32, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


# ============================================================================
# ПОДДЕРЖКА
# ============================================================================
class SupportTicket(models.Model):
    class Status(models.TextChoices):
        OPEN     = 'open',     'Открыто'
        ANSWERED = 'answered', 'Отвечено'
        CLOSED   = 'closed',   'Закрыто'

    class Category(models.TextChoices):
        TECHNICAL = 'technical', 'Технический вопрос'
        BILLING   = 'billing',   'Оплата и финансы'
        ACCOUNT   = 'account',   'Учётная запись'
        PROJECT   = 'project',   'Вопрос по проекту'
        OTHER     = 'other',     'Прочее'

    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tickets')
    subject    = models.CharField('Тема', max_length=200)
    category   = models.CharField(max_length=20, choices=Category.choices, default=Category.OTHER)
    status     = models.CharField(max_length=12, choices=Status.choices,   default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Обращение'
        verbose_name_plural = 'Обращения'
        ordering = ['-updated_at']


class SupportMessage(models.Model):
    ticket         = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name='messages')
    author         = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='support_messages')
    body           = models.TextField()
    is_admin_reply = models.BooleanField(default=False)
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']


# ============================================================================
# FAQ
# ============================================================================
class FAQEntry(models.Model):
    class Category(models.TextChoices):
        GENERAL    = 'general',    'Общее'
        INVESTMENT = 'investment', 'Инвестирование'
        PAYMENT    = 'payment',    'Платежи'
        ACCOUNT    = 'account',    'Учётная запись'
        SECURITY   = 'security',   'Безопасность'

    category     = models.CharField(max_length=20, choices=Category.choices, default=Category.GENERAL)
    question     = models.CharField(max_length=300)
    answer       = models.TextField()
    order        = models.PositiveSmallIntegerField(default=0)
    is_published = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Вопрос FAQ'
        verbose_name_plural = 'FAQ'
        ordering = ['category', 'order', 'id']


# ============================================================================
# УВЕДОМЛЕНИЯ
# ============================================================================
class Notification(models.Model):
    class Type(models.TextChoices):
        PROJECT_UPDATED = 'project_updated', 'Проект обновлён'
        DIVIDEND        = 'dividend',        'Дивиденды'
        VERIFICATION    = 'verification',    'Верификация'
        SUPPORT_REPLY   = 'support_reply',   'Ответ поддержки'
        SYSTEM          = 'system',          'Системное'
        PROMOTION       = 'promotion',       'Продвижение'

    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type       = models.CharField(max_length=24, choices=Type.choices)
    title      = models.CharField(max_length=200)
    body       = models.TextField(blank=True)
    link_to    = models.CharField(max_length=200, blank=True)
    project    = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True, related_name='notifications')
    is_read    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


# ============================================================================
# ТАРИФЫ ПРОДВИЖЕНИЯ
# ============================================================================
PROMOTION_TIERS_CONFIG = {
    'highlight': {
        'name':         'Подсветка карточки',
        'description':  'Карточка проекта выделяется акцентной рамкой и значком на витрине.',
        'price':        15_000,
        'duration_days': 14,
        'features':     ['Акцентная рамка', 'Подсветка на витрине', '+30% видимости'],
    },
    'top': {
        'name':         'В топе витрины',
        'description':  'Проект всегда в первых строках при сортировке по умолчанию.',
        'price':        45_000,
        'duration_days': 14,
        'features':     ['Закрепление в топе', 'Акцентная рамка', '+150% видимости'],
    },
    'main': {
        'name':         'На главной странице',
        'description':  'Проект попадает в карусель «Горячие предложения» на главной.',
        'price':        90_000,
        'duration_days': 14,
        'features':     ['Карусель главной', 'Топ витрины', 'Акцентная рамка', '+400% видимости'],
    },
}
