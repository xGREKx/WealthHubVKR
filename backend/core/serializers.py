"""DRF-сериализаторы Wealth Hub."""
from decimal import Decimal
from rest_framework import serializers
from .models import (
    User, Portfolio, Project, TeamMember, Document, Investment, Transaction,
    SupportTicket, SupportMessage, FAQEntry, Notification, DividendPayout,
    ProjectUpdate,
)


# ============================================================================
# ПОЛЬЗОВАТЕЛЬ
# ============================================================================
class UserPublicSerializer(serializers.ModelSerializer):
    full_name_ru = serializers.CharField(read_only=True)
    avatar_url   = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'full_name_ru', 'role', 'avatar_url')

    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            url = obj.avatar.url
            return request.build_absolute_uri(url) if request else url
        return None


class UserProfileSerializer(serializers.ModelSerializer):
    full_name_ru = serializers.CharField(read_only=True)
    can_invest   = serializers.BooleanField(read_only=True)
    avatar_url   = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'role',
                  'last_name_ru', 'first_name_ru', 'middle_name_ru', 'full_name_ru',
                  'inn', 'passport', 'phone',
                  'avatar', 'avatar_url',
                  'esia_uid', 'registered_via_esia',
                  'e_signature_status', 'verification_status', 'can_invest',
                  'api_token', 'two_factor_enabled', 'created_at')
        read_only_fields = ('id', 'username', 'role', 'esia_uid', 'registered_via_esia',
                           'e_signature_status', 'verification_status', 'api_token', 'created_at')
        extra_kwargs = {'avatar': {'write_only': True, 'required': False}}

    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            url = obj.avatar.url
            return request.build_absolute_uri(url) if request else url
        return None


class RegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    role     = serializers.ChoiceField(
        choices=[('investor', 'Инвестор'), ('entrepreneur', 'Предприниматель')],
        default='investor'
    )

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'role',
                  'last_name_ru', 'first_name_ru', 'middle_name_ru', 'inn', 'phone')

    def validate_username(self, v):
        if User.objects.filter(username=v).exists():
            raise serializers.ValidationError('Пользователь с таким логином уже существует.')
        return v

    def validate_email(self, v):
        if v and User.objects.filter(email=v).exists():
            raise serializers.ValidationError('Этот e-mail уже используется.')
        return v

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        Portfolio.objects.create(user=user, balance=Decimal('5000000'))
        return user


class PortfolioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Portfolio
        fields = ('balance', 'invested', 'dividends')


class AdminUserListSerializer(serializers.ModelSerializer):
    full_name_ru = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'role', 'full_name_ru',
                  'verification_status', 'registered_via_esia', 'created_at')


# ============================================================================
# ПРОЕКТЫ
# ============================================================================
class TeamMemberSerializer(serializers.ModelSerializer):
    cv_url = serializers.SerializerMethodField()

    class Meta:
        model = TeamMember
        fields = ('id', 'name', 'role', 'bio', 'cv_file', 'cv_url')
        extra_kwargs = {'cv_file': {'write_only': True, 'required': False, 'allow_null': True}}

    def get_cv_url(self, obj):
        if obj.cv_file:
            request = self.context.get('request')
            url = obj.cv_file.url
            return request.build_absolute_uri(url) if request else url
        return None


class DocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = ('id', 'name', 'type', 'file', 'file_url', 'size_bytes', 'uploaded_at')
        extra_kwargs = {'file': {'write_only': True}}

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            url = obj.file.url
            return request.build_absolute_uri(url) if request else url
        return None


class ProjectListSerializer(serializers.ModelSerializer):
    cover_url       = serializers.SerializerMethodField()
    attractiveness  = serializers.SerializerMethodField()
    is_recommended  = serializers.SerializerMethodField()
    owner           = serializers.UUIDField(source='owner.id', read_only=True)
    owner_name      = serializers.CharField(source='owner.full_name_ru', read_only=True)

    class Meta:
        model = Project
        fields = ('id', 'name', 'slogan', 'industry', 'type', 'geography',
                  'goal', 'raised', 'min_investment', 'expected_return',
                  'payback_years', 'closing_date',
                  'risk', 'attractiveness', 'status', 'promoted', 'promotion_tier',
                  'cover_url', 'is_recommended', 'owner', 'owner_name', 'created_at')

    def get_cover_url(self, obj):
        if obj.cover_image:
            request = self.context.get('request')
            url = obj.cover_image.url
            return request.build_absolute_uri(url) if request else url
        return None

    def _personalized_assessment(self, obj):
        """
        Возвращает результат рекомендательной подсистемы для текущего
        запросившего пользователя, либо None, если запрос не от инвестора.
        Кэшируется на сериализаторе, чтобы избежать двух вызовов
        для одного объекта.
        """
        cache = getattr(self, '_assess_cache', None)
        if cache is None:
            cache = self._assess_cache = {}
        if obj.id in cache:
            return cache[obj.id]

        request = self.context.get('request')
        user = getattr(request, 'user', None) if request else None
        if not user or not user.is_authenticated or getattr(user, 'role', None) != User.Role.INVESTOR:
            cache[obj.id] = None
            return None

        # Импорт здесь, чтобы избежать циклов при загрузке модуля
        from .recommender import assess_attractiveness_for_investor
        result = assess_attractiveness_for_investor(obj, user)
        cache[obj.id] = result
        return result

    def get_attractiveness(self, obj):
        """
        Возвращает уровень привлекательности с учётом профиля инвестора.
        Если запрос не от инвестора — возвращает значение, сохранённое модератором.
        """
        assessment = self._personalized_assessment(obj)
        return assessment['level'] if assessment else obj.attractiveness

    def get_is_recommended(self, obj):
        """
        True — если проект попадает под рекомендацию системы для текущего инвестора
        (привлекательность HIGH по содержательным факторам). Используется фронтом
        для подсветки карточки рамкой наравне с продвинутыми (promoted).
        """
        assessment = self._personalized_assessment(obj)
        if not assessment:
            return False
        return assessment['level'] == 'high' and assessment.get('personalized', False)


class ProjectDetailSerializer(serializers.ModelSerializer):
    team      = TeamMemberSerializer(many=True, read_only=True)
    documents = DocumentSerializer(many=True, read_only=True)
    owner     = UserPublicSerializer(read_only=True)
    cover_url = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = ('id', 'owner', 'name', 'slogan', 'description', 'full_content',
                  'industry', 'type', 'geography',
                  'goal', 'raised', 'min_investment', 'expected_return',
                  'payback_years', 'closing_date',
                  'risk', 'attractiveness', 'status', 'promoted', 'promotion_tier',
                  'cover_image', 'cover_url',
                  'team', 'documents',
                  'created_at', 'updated_at')
        extra_kwargs = {'cover_image': {'write_only': True, 'required': False, 'allow_null': True}}

    def get_cover_url(self, obj):
        if obj.cover_image:
            request = self.context.get('request')
            url = obj.cover_image.url
            return request.build_absolute_uri(url) if request else url
        return None


class ProjectCreateUpdateSerializer(serializers.ModelSerializer):
    """Создание и редактирование проекта (предприниматель)."""
    cover_image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Project
        fields = ('name', 'slogan', 'description', 'full_content',
                  'industry', 'type', 'geography',
                  'goal', 'min_investment', 'expected_return', 'payback_years',
                  'cover_image')

    def create(self, validated_data):
        request = self.context['request']
        return Project.objects.create(
            owner=request.user,
            status=Project.Status.PENDING,
            **validated_data
        )


class ProjectUpdateSerializer(serializers.ModelSerializer):
    author = UserPublicSerializer(read_only=True)

    class Meta:
        model = ProjectUpdate
        fields = ('id', 'project', 'author', 'summary', 'details', 'created_at')


class ModerationSerializer(serializers.Serializer):
    action         = serializers.ChoiceField(choices=['approve', 'reject'])
    risk           = serializers.ChoiceField(choices=Project.Risk.choices, required=False)
    attractiveness = serializers.ChoiceField(choices=Project.Attractiveness.choices, required=False)
    comment        = serializers.CharField(required=False, allow_blank=True)


# ============================================================================
# ИНВЕСТИЦИИ
# ============================================================================
class InvestmentSerializer(serializers.ModelSerializer):
    project = ProjectListSerializer(read_only=True)

    class Meta:
        model = Investment
        fields = ('id', 'project', 'amount', 'share_percent',
                  'risk_at_purchase', 'risk_disclaimer_accepted',
                  'signature_hash', 'escrow_account',
                  'is_sold', 'sold_at', 'created_at')


class InvestmentCreateSerializer(serializers.Serializer):
    project_id = serializers.UUIDField()
    amount     = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal('1'))
    risk_disclaimer_accepted = serializers.BooleanField()

    def validate_risk_disclaimer_accepted(self, value):
        if not value:
            raise serializers.ValidationError(
                'Согласно ФЗ-259, инвестор обязан подтвердить ознакомление с риск-декларацией.'
            )
        return value


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ('id', 'type', 'amount', 'status', 'escrow_account', 'created_at')


class DividendPayoutSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='investment.project.name', read_only=True)

    class Meta:
        model = DividendPayout
        fields = ('id', 'investment', 'project_name', 'amount', 'paid_at', 'is_paid', 'note')


# ============================================================================
# ПОДДЕРЖКА
# ============================================================================
class SupportMessageSerializer(serializers.ModelSerializer):
    author = UserPublicSerializer(read_only=True)

    class Meta:
        model = SupportMessage
        fields = ('id', 'author', 'body', 'is_admin_reply', 'created_at')


class SupportTicketListSerializer(serializers.ModelSerializer):
    user            = UserPublicSerializer(read_only=True)
    last_message    = serializers.SerializerMethodField()
    messages_count  = serializers.SerializerMethodField()

    class Meta:
        model = SupportTicket
        fields = ('id', 'user', 'subject', 'category', 'status',
                  'created_at', 'updated_at', 'last_message', 'messages_count')

    def get_last_message(self, obj):
        msg = obj.messages.last()
        return SupportMessageSerializer(msg, context=self.context).data if msg else None

    def get_messages_count(self, obj):
        return obj.messages.count()


class SupportTicketDetailSerializer(serializers.ModelSerializer):
    user     = UserPublicSerializer(read_only=True)
    messages = SupportMessageSerializer(many=True, read_only=True)

    class Meta:
        model = SupportTicket
        fields = ('id', 'user', 'subject', 'category', 'status',
                  'created_at', 'updated_at', 'messages')


class SupportTicketCreateSerializer(serializers.ModelSerializer):
    body = serializers.CharField(write_only=True)

    class Meta:
        model = SupportTicket
        fields = ('subject', 'category', 'body')

    def create(self, validated_data):
        body = validated_data.pop('body')
        request = self.context['request']
        ticket = SupportTicket.objects.create(user=request.user, **validated_data)
        SupportMessage.objects.create(ticket=ticket, author=request.user, body=body)
        return ticket


# ============================================================================
# FAQ + УВЕДОМЛЕНИЯ
# ============================================================================
class FAQEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQEntry
        fields = ('id', 'category', 'question', 'answer', 'order')


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ('id', 'type', 'title', 'body', 'link_to', 'project', 'is_read', 'created_at')
