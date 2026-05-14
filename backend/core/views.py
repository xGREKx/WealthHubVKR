"""DRF views Wealth Hub."""
import hashlib
import secrets
from decimal import Decimal
from datetime import timedelta

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status, viewsets, filters
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    User, Portfolio, Project, TeamMember, Document, Investment, Transaction,
    SupportTicket, SupportMessage, FAQEntry, Notification, DividendPayout,
    ProjectUpdate, PROMOTION_TIERS_CONFIG,
)
from .serializers import (
    RegistrationSerializer, UserProfileSerializer, PortfolioSerializer,
    AdminUserListSerializer,
    ProjectListSerializer, ProjectDetailSerializer, ProjectCreateUpdateSerializer,
    ProjectUpdateSerializer,
    ModerationSerializer, InvestmentSerializer, InvestmentCreateSerializer,
    TransactionSerializer, TeamMemberSerializer, DocumentSerializer,
    SupportTicketListSerializer, SupportTicketDetailSerializer,
    SupportTicketCreateSerializer,
    FAQEntrySerializer, NotificationSerializer, DividendPayoutSerializer,
)
from .permissions import IsInvestor, IsAdmin, IsOwnerOrReadOnly
from .recommender import assess_project_risk, assess_attractiveness_for_investor


def make_jwt_response(user):
    refresh = RefreshToken.for_user(user)
    return {
        'access':  str(refresh.access_token),
        'refresh': str(refresh),
        'user':    UserProfileSerializer(user).data,
    }


# ============================================================================
# АУТЕНТИФИКАЦИЯ
# ============================================================================
class RegistrationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(make_jwt_response(user), status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        from django.contrib.auth import authenticate
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')
        user = authenticate(username=username, password=password)
        if not user:
            return Response({'detail': 'Неверный логин или пароль.'},
                          status=status.HTTP_401_UNAUTHORIZED)
        return Response(make_jwt_response(user))


class ESIAAuthView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        esia_uid = request.data.get('esia_uid') or f'demo_{secrets.token_hex(4)}'
        role     = request.data.get('role', 'investor')
        valid_role = role if role in ('investor', 'entrepreneur', 'admin') else 'investor'

        defaults = {
            'username':            f'esia_{esia_uid}',
            'role':                valid_role,
            'registered_via_esia': True,
            'e_signature_status':  User.ESignatureStatus.VERIFIED,
            'verification_status': User.VerificationStatus.VERIFIED_ESIA,
            'first_name_ru':       request.data.get('first_name', 'Тест'),
            'last_name_ru':        request.data.get('last_name', 'Госуслугович'),
            'middle_name_ru':      request.data.get('middle_name', 'Демо'),
            'inn':                 request.data.get('inn', '770000000000'),
        }

        if valid_role == 'admin':
            defaults.update({
                'first_name_ru':  'Анна', 'last_name_ru': 'Волкова', 'middle_name_ru': 'Александровна',
                'is_staff': True,
            })
        elif valid_role == 'entrepreneur':
            defaults.update({
                'first_name_ru':  'Екатерина', 'last_name_ru': 'Морозова', 'middle_name_ru': 'Дмитриевна',
            })
        elif valid_role == 'investor' and not request.data.get('first_name'):
            defaults.update({
                'first_name_ru':  'Алексей', 'last_name_ru': 'Иванов', 'middle_name_ru': 'Сергеевич',
            })

        user, created = User.objects.get_or_create(esia_uid=esia_uid, defaults=defaults)

        if not created and user.role != valid_role:
            user.role = valid_role
            if valid_role == 'admin':
                user.is_staff = True
            user.save(update_fields=['role', 'is_staff'])

        if created:
            Portfolio.objects.create(user=user, balance=Decimal('5000000'))

        return Response(make_jwt_response(user))


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class   = UserProfileSerializer
    permission_classes = [IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        return self.request.user

    def patch(self, request, *args, **kwargs):
        user = request.user
        if not user.registered_via_esia and user.verification_status != User.VerificationStatus.VERIFIED_ESIA:
            user.verification_status = User.VerificationStatus.PENDING
            user.save(update_fields=['verification_status'])
        return super().patch(request, *args, **kwargs)


class RegenerateApiTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        user.api_token = f'wh_live_{secrets.token_urlsafe(24)}'
        user.save(update_fields=['api_token'])
        return Response({'api_token': user.api_token})


class PortfolioView(generics.RetrieveAPIView):
    serializer_class   = PortfolioSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        portfolio, _ = Portfolio.objects.get_or_create(user=self.request.user)
        return portfolio


class VerifyViaESIAView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        user.verification_status = User.VerificationStatus.VERIFIED_ESIA
        user.e_signature_status  = User.ESignatureStatus.VERIFIED
        user.registered_via_esia = True
        if not user.esia_uid:
            user.esia_uid = f'manual_{secrets.token_hex(4)}'
        user.save()
        Notification.objects.create(
            user=user, type=Notification.Type.VERIFICATION,
            title='Личность подтверждена через Госуслуги',
            body='Теперь вам доступны инвестиции в проекты.',
        )
        return Response(UserProfileSerializer(user).data)


class SubmitForVerificationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.registered_via_esia:
            return Response({'detail': 'Аккаунт подтверждён через Госуслуги. Ручная проверка не требуется.'},
                          status=status.HTTP_400_BAD_REQUEST)
        user.verification_status = User.VerificationStatus.PENDING
        user.save(update_fields=['verification_status'])
        return Response({'detail': 'Заявка на проверку отправлена.'})


# ============================================================================
# ПРОЕКТЫ
# ============================================================================
PROJECT_FIELD_LABELS = {
    'name':            'название',
    'slogan':          'слоган',
    'description':     'описание',
    'full_content':    'подробное описание',
    'goal':            'цель сбора',
    'min_investment':  'минимальная сумма',
    'expected_return': 'ожидаемая доходность',
    'payback_years':   'срок окупаемости',
    'geography':       'география',
    'industry':        'отрасль',
    'type':            'тип проекта',
    'cover_image':     'обложка',
}


def diff_project(old, new_data):
    """Возвращает словарь {field: (old, new)} с изменениями."""
    changes = {}
    for f in PROJECT_FIELD_LABELS:
        if f not in new_data:
            continue
        old_val = getattr(old, f, None)
        new_val = new_data[f]
        # сравниваем как строки чтобы избежать Decimal/str различий
        if str(old_val or '') != str(new_val or ''):
            changes[f] = {'old': str(old_val), 'new': str(new_val)}
    return changes


def notify_investors_about_update(project, changes, author):
    """Создаёт уведомления для всех инвесторов проекта о его изменениях."""
    if not changes:
        return
    fields_changed = ', '.join(PROJECT_FIELD_LABELS.get(f, f) for f in changes)
    summary = f'Изменены поля: {fields_changed}'

    update = ProjectUpdate.objects.create(
        project=project, author=author, summary=summary, details=changes
    )

    investor_ids = (
        Investment.objects
        .filter(project=project, is_sold=False)
        .values_list('investor_id', flat=True)
        .distinct()
    )
    notifications = [
        Notification(
            user_id=uid,
            type=Notification.Type.PROJECT_UPDATED,
            title=f'Проект «{project.name}» обновлён',
            body=summary,
            project=project,
            link_to=f'/project/{project.id}',
        )
        for uid in investor_ids
    ]
    Notification.objects.bulk_create(notifications)
    return update


class ProjectViewSet(viewsets.ModelViewSet):
    queryset           = Project.objects.all().select_related('owner').prefetch_related('team', 'documents')
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    parser_classes     = [MultiPartParser, FormParser, JSONParser]

    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['industry', 'type', 'risk', 'status', 'attractiveness']
    search_fields    = ['name', 'slogan', 'description']
    ordering_fields  = ['created_at', 'goal', 'raised', 'expected_return']
    ordering         = ['-promoted', '-created_at']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        return super().get_permissions()

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        # ?mine=1 — только проекты текущего пользователя (любые статусы).
        # Используется страницей предпринимателя, чтобы видеть свои черновики,
        # модерируемые, одобренные и отклонённые проекты в одной выдаче.
        mine_only = self.request.query_params.get('mine') == '1'
        if mine_only and user.is_authenticated:
            return qs.filter(owner=user)

        if not user.is_authenticated or user.role == User.Role.INVESTOR:
            return qs.filter(status=Project.Status.ACTIVE)
        if user.role == User.Role.ENTREPRENEUR:
            return (qs.filter(owner=user) | qs.filter(status=Project.Status.ACTIVE)).distinct()
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return ProjectListSerializer
        if self.action in ('create', 'partial_update', 'update'):
            return ProjectCreateUpdateSerializer
        return ProjectDetailSerializer

    def update(self, request, *args, **kwargs):
        # Diff + уведомления + переотправка на модерацию для активных проектов
        instance = self.get_object()
        old_status = instance.status

        # Считаем изменения ДО сохранения
        new_data = request.data
        changes = diff_project(instance, new_data)

        response = super().update(request, *args, **kwargs)

        instance.refresh_from_db()

        # Уведомления и переход в pending только если поменялись бизнес-поля
        if changes and old_status == Project.Status.ACTIVE:
            notify_investors_about_update(instance, changes, request.user)
            instance.status = Project.Status.PENDING
            instance.save(update_fields=['status'])
            # И уведомление модераторам
            for admin in User.objects.filter(role=User.Role.ADMIN):
                Notification.objects.create(
                    user=admin, type=Notification.Type.SYSTEM,
                    title=f'Проект «{instance.name}» отправлен на повторную модерацию',
                    body=f'Автор изменил: {", ".join(PROJECT_FIELD_LABELS.get(f, f) for f in changes)}',
                    project=instance, link_to=f'/admin',
                )
        return response

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdmin])
    def moderate(self, request, pk=None):
        project    = self.get_object()
        serializer = ModerationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if data['action'] == 'approve':
            project.status = Project.Status.ACTIVE
            project.risk           = data.get('risk',           project.risk)
            project.attractiveness = data.get('attractiveness', project.attractiveness)
        else:
            project.status = Project.Status.REJECTED

        project.moderator = request.user
        project.moderation_comment = data.get('comment', '')
        project.save()

        Notification.objects.create(
            user=project.owner, type=Notification.Type.SYSTEM,
            title=f'Проект «{project.name}» {"одобрен" if data["action"] == "approve" else "отклонён"}',
            body=data.get('comment', ''),
            project=project,
        )
        return Response(ProjectDetailSerializer(project, context={'request': request}).data)

    @action(detail=True, methods=['get'], url_path='investors', permission_classes=[IsAuthenticated])
    def investors(self, request, pk=None):
        """
        Возвращает список инвесторов проекта с агрегированными вкладами
        и процентами от собранной суммы. Доступно владельцу проекта
        и администраторам — другим пользователям API возвращает 403.
        """
        project = self.get_object()
        user = request.user

        is_owner = (project.owner_id == user.id)
        is_admin = (getattr(user, 'role', None) == User.Role.ADMIN)
        if not (is_owner or is_admin):
            return Response(
                {'detail': 'Доступно только владельцу проекта и администратору.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        from django.db.models import Sum, Min

        # Группируем все инвестиции по инвестору: общая сумма и дата первого вклада.
        aggregated = (
            project.investments
            .values('investor_id')
            .annotate(total_amount=Sum('amount'),
                      first_invested_at=Min('created_at'))
            .order_by('-total_amount')
        )

        total_raised = sum((a['total_amount'] for a in aggregated), Decimal('0'))

        investor_ids = [a['investor_id'] for a in aggregated]
        investors_map = {u.id: u for u in User.objects.filter(id__in=investor_ids)}

        # Также вытаскиваем риск, который инвестор подтверждал при первой сделке —
        # предприниматель может видеть, понимали ли инвесторы риск-профиль проекта.
        first_inv_map = {}
        for inv in project.investments.filter(investor_id__in=investor_ids).order_by('created_at'):
            first_inv_map.setdefault(inv.investor_id, inv.risk_at_purchase)

        rows = []
        for entry in aggregated:
            investor = investors_map.get(entry['investor_id'])
            if not investor:
                continue
            share = (entry['total_amount'] / total_raised * Decimal('100')) if total_raised else Decimal('0')
            full_name = (
                f'{investor.last_name_ru or ""} {investor.first_name_ru or ""}'.strip()
                or investor.username
            )
            rows.append({
                'investor_id':       str(investor.id),
                'full_name':         full_name,
                'esia_verified':     investor.verification_status == User.VerificationStatus.VERIFIED_ESIA,
                'amount':            entry['total_amount'],
                'share_pct':         round(float(share), 2),
                'first_invested_at': entry['first_invested_at'],
                'risk_at_purchase':  first_inv_map.get(entry['investor_id']),
            })

        return Response({
            'project_id':       str(project.id),
            'project_name':     project.name,
            'total_raised':     total_raised,
            'investors_count':  len(rows),
            'investors':        rows,
        })

    @action(detail=True, methods=['get'], url_path='recommendation', permission_classes=[IsAuthenticated, IsAdmin])
    def recommendation(self, request, pk=None):
        """
        Рекомендация рекомендательной подсистемы для модератора:
        предлагаемый уровень риска проекта и расшифровка по факторам.
        """
        project = self.get_object()
        risk = assess_project_risk(project)
        # Для контекста — также покажем оценку привлекательности «глазами»
        # типичного инвестора (без личной истории), чтобы модератор видел,
        # насколько проект потенциально интересен.
        baseline = assess_attractiveness_for_investor(project, None)
        return Response({
            'risk':                  risk,
            'attractiveness_preview': baseline,
        })

    @action(detail=True, methods=['get'], url_path='updates', permission_classes=[AllowAny])
    def updates_history(self, request, pk=None):
        """История обновлений проекта."""
        project = self.get_object()
        updates = project.updates.all()[:50]
        return Response(ProjectUpdateSerializer(updates, many=True, context={'request': request}).data)


# === Команда проекта (CRUD) ===
class TeamMemberViewSet(viewsets.ModelViewSet):
    serializer_class   = TeamMemberSerializer
    permission_classes = [IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        project_id = self.kwargs.get('project_pk')
        return TeamMember.objects.filter(project_id=project_id)

    def perform_create(self, serializer):
        project_id = self.kwargs.get('project_pk')
        project = get_object_or_404(Project, pk=project_id)
        if project.owner_id != self.request.user.id and self.request.user.role != User.Role.ADMIN:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Только владелец может изменять команду.')
        serializer.save(project=project)


# === Документы проекта (CRUD) ===
class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class   = DocumentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser]

    def get_queryset(self):
        project_id = self.kwargs.get('project_pk')
        return Document.objects.filter(project_id=project_id)

    def perform_create(self, serializer):
        project_id = self.kwargs.get('project_pk')
        project = get_object_or_404(Project, pk=project_id)
        if project.owner_id != self.request.user.id and self.request.user.role != User.Role.ADMIN:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Только владелец может загружать документы.')
        file = serializer.validated_data.get('file')
        size = file.size if file else 0
        serializer.save(project=project, size_bytes=size, name=serializer.validated_data.get('name') or (file.name if file else ''))


# ============================================================================
# ПРОДВИЖЕНИЕ
# ============================================================================
class PromotionTiersView(APIView):
    """Список доступных тарифов продвижения."""
    permission_classes = [AllowAny]

    def get(self, request):
        return Response([
            {'tier': tier_id, **config}
            for tier_id, config in PROMOTION_TIERS_CONFIG.items()
        ])


class BuyPromotionView(APIView):
    """Покупка тарифа продвижения для проекта."""
    permission_classes = [IsAuthenticated]

    def post(self, request, project_id):
        tier = request.data.get('tier')
        if tier not in PROMOTION_TIERS_CONFIG:
            return Response({'detail': 'Неизвестный тариф'}, status=400)

        config  = PROMOTION_TIERS_CONFIG[tier]
        price   = Decimal(str(config['price']))
        days    = config['duration_days']

        project = get_object_or_404(Project, pk=project_id)
        if project.owner_id != request.user.id:
            return Response({'detail': 'Только владелец может покупать продвижение'},
                          status=403)
        if project.status != Project.Status.ACTIVE:
            return Response({'detail': 'Продвигать можно только активные проекты'},
                          status=400)

        with transaction.atomic():
            portfolio = Portfolio.objects.select_for_update().get(user=request.user)
            if portfolio.balance < price:
                return Response({'detail': f'Недостаточно средств на балансе. Требуется {price} ₽'},
                              status=400)

            portfolio.balance -= price
            portfolio.save(update_fields=['balance'])

            project.promoted = True
            project.promotion_tier = tier
            project.promotion_until = timezone.now() + timedelta(days=days)
            project.save(update_fields=['promoted', 'promotion_tier', 'promotion_until'])

            Transaction.objects.create(
                user=request.user, type=Transaction.Type.PROMOTION,
                amount=price, status=Transaction.Status.COMPLETED,
            )
            Notification.objects.create(
                user=request.user, type=Notification.Type.PROMOTION,
                title=f'Подключено продвижение «{config["name"]}»',
                body=f'Действует {days} дней. Списано {price} ₽.',
                project=project,
            )

        return Response({
            'detail': f'Продвижение активировано на {days} дней',
            'project': ProjectDetailSerializer(project, context={'request': request}).data,
        })


# ============================================================================
# ИНВЕСТИЦИИ
# ============================================================================
class InvestmentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class   = InvestmentSerializer
    permission_classes = [IsAuthenticated, IsInvestor]

    def get_queryset(self):
        return (
            Investment.objects.filter(investor=self.request.user)
            .select_related('project').order_by('-created_at')
        )

    @action(detail=False, methods=['post'], url_path='create')
    def create_investment(self, request):
        serializer = InvestmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if not request.user.can_invest:
            return Response(
                {'detail': 'Для инвестирования необходимо подтвердить личность через Госуслуги.'},
                status=status.HTTP_403_FORBIDDEN
            )

        with transaction.atomic():
            project = (
                Project.objects.select_for_update()
                .get(pk=data['project_id'], status=Project.Status.ACTIVE)
            )
            portfolio = Portfolio.objects.select_for_update().get(user=request.user)

            amount = data['amount']
            if amount < project.min_investment:
                return Response({'detail': f'Минимальная сумма — {project.min_investment} ₽'},
                              status=status.HTTP_400_BAD_REQUEST)
            if portfolio.balance < amount:
                return Response({'detail': 'Недостаточно средств на балансе'},
                              status=status.HTTP_400_BAD_REQUEST)
            if project.raised + amount > project.goal:
                return Response({'detail': f'Осталось привлечь {project.goal - project.raised} ₽'},
                              status=status.HTTP_400_BAD_REQUEST)

            payload  = f'{request.user.id}|{project.id}|{amount}|{secrets.token_hex(8)}'
            sig_hash = hashlib.sha256(payload.encode()).hexdigest()
            escrow_account = f'40817810{secrets.randbelow(10**12):012d}'

            investment = Investment.objects.create(
                investor=request.user, project=project, amount=amount,
                share_percent=(amount / project.goal) * 100,
                risk_at_purchase=project.risk or Project.Risk.MEDIUM,
                risk_disclaimer_accepted=True,
                signature_hash=sig_hash, escrow_account=escrow_account,
            )

            project.raised += amount
            project.save(update_fields=['raised'])

            portfolio.balance  -= amount
            portfolio.invested += amount
            portfolio.save(update_fields=['balance', 'invested'])

            Transaction.objects.create(
                user=request.user, type=Transaction.Type.INVESTMENT,
                amount=amount, status=Transaction.Status.COMPLETED,
                investment=investment, escrow_account=escrow_account,
            )

            # Авто-генерация графика квартальных дивидендных выплат
            # на 4 квартала вперёд
            from datetime import timedelta as _td
            from django.utils import timezone as _tz
            quarterly_amount = (Decimal(amount) * Decimal(str(project.expected_return))
                               / Decimal('100') / Decimal('4'))
            for q in range(1, 5):
                DividendPayout.objects.create(
                    investment=investment,
                    amount=quarterly_amount.quantize(Decimal('0.01')),
                    paid_at=_tz.now() + _td(days=90 * q),
                    is_paid=False,
                    note=f'Запланированная квартальная выплата #{q}',
                )

        return Response(InvestmentSerializer(investment, context={'request': request}).data,
                       status=status.HTTP_201_CREATED)


class TransactionListView(generics.ListAPIView):
    serializer_class   = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user).order_by('-created_at')


class DividendListView(generics.ListAPIView):
    serializer_class   = DividendPayoutSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return DividendPayout.objects.filter(investment__investor=self.request.user).select_related('investment__project')


# ============================================================================
# ПОДДЕРЖКА
# ============================================================================
class SupportTicketViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.ADMIN:
            return SupportTicket.objects.all().select_related('user').prefetch_related('messages')
        return SupportTicket.objects.filter(user=user).prefetch_related('messages')

    def get_serializer_class(self):
        if self.action == 'create':
            return SupportTicketCreateSerializer
        if self.action == 'list':
            return SupportTicketListSerializer
        return SupportTicketDetailSerializer

    @action(detail=True, methods=['post'], url_path='reply')
    def reply(self, request, pk=None):
        ticket = self.get_object()
        body   = request.data.get('body', '').strip()
        if not body:
            return Response({'detail': 'Текст сообщения не может быть пустым.'},
                          status=status.HTTP_400_BAD_REQUEST)

        is_admin = request.user.role == User.Role.ADMIN
        SupportMessage.objects.create(
            ticket=ticket, author=request.user, body=body, is_admin_reply=is_admin
        )
        if is_admin:
            ticket.status = SupportTicket.Status.ANSWERED
            Notification.objects.create(
                user=ticket.user, type=Notification.Type.SUPPORT_REPLY,
                title=f'Ответ на ваше обращение «{ticket.subject}»',
                body=body[:200],
            )
        else:
            if ticket.status == SupportTicket.Status.ANSWERED:
                ticket.status = SupportTicket.Status.OPEN
        ticket.save(update_fields=['status', 'updated_at'])
        return Response(SupportTicketDetailSerializer(ticket, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='close')
    def close(self, request, pk=None):
        ticket = self.get_object()
        if request.user.role != User.Role.ADMIN and ticket.user_id != request.user.id:
            return Response({'detail': 'Нет прав'}, status=status.HTTP_403_FORBIDDEN)
        ticket.status = SupportTicket.Status.CLOSED
        ticket.save(update_fields=['status'])
        return Response({'detail': 'Обращение закрыто'})


# ============================================================================
# FAQ + УВЕДОМЛЕНИЯ
# ============================================================================
class FAQListView(generics.ListAPIView):
    queryset           = FAQEntry.objects.filter(is_published=True)
    serializer_class   = FAQEntrySerializer
    permission_classes = [AllowAny]


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class   = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({'count': count})

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'detail': 'OK'})

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.save(update_fields=['is_read'])
        return Response({'detail': 'OK'})


# ============================================================================
# АДМИН: УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ
# ============================================================================
class AdminUserViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class   = AdminUserListSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset           = User.objects.all().order_by('-created_at')
    filter_backends    = [filters.SearchFilter, DjangoFilterBackend]
    search_fields      = ['username', 'email', 'last_name_ru', 'first_name_ru', 'inn']
    filterset_fields   = ['role', 'verification_status']

    @action(detail=True, methods=['post'], url_path='make-admin')
    def make_admin(self, request, pk=None):
        user = self.get_object()
        user.role = User.Role.ADMIN
        user.is_staff = True
        user.save(update_fields=['role', 'is_staff'])
        Notification.objects.create(
            user=user, type=Notification.Type.SYSTEM,
            title='Вам выданы права администратора',
            body='Теперь вы можете модерировать проекты и обращения.',
        )
        return Response(AdminUserListSerializer(user).data)

    @action(detail=True, methods=['post'], url_path='revoke-admin')
    def revoke_admin(self, request, pk=None):
        user = self.get_object()
        if user.id == request.user.id:
            return Response({'detail': 'Нельзя снять права с самого себя.'}, status=400)
        user.role = User.Role.INVESTOR
        user.is_staff = False
        user.save(update_fields=['role', 'is_staff'])
        return Response(AdminUserListSerializer(user).data)

    @action(detail=True, methods=['post'], url_path='verify')
    def verify(self, request, pk=None):
        user = self.get_object()
        method = request.data.get('method', 'manual')
        if method == 'esia':
            user.verification_status = User.VerificationStatus.VERIFIED_ESIA
            user.registered_via_esia = True
        else:
            user.verification_status = User.VerificationStatus.VERIFIED_MANUAL
        user.e_signature_status = User.ESignatureStatus.VERIFIED
        user.save()
        Notification.objects.create(
            user=user, type=Notification.Type.VERIFICATION,
            title='Ваша учётная запись подтверждена',
            body='Теперь вы можете полноценно использовать платформу.',
        )
        return Response(AdminUserListSerializer(user).data)

    @action(detail=True, methods=['post'], url_path='reject-verification')
    def reject_verification(self, request, pk=None):
        user = self.get_object()
        user.verification_status = User.VerificationStatus.NOT_VERIFIED
        user.save(update_fields=['verification_status'])
        return Response(AdminUserListSerializer(user).data)


# ============================================================================
# КОРНЕВОЙ ENDPOINT
# ============================================================================
class APIRootView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({
            'service': 'Wealth Hub API',
            'version': '1.1',
            'endpoints': {
                'auth_register':     '/api/auth/register/',
                'auth_login':        '/api/auth/login/',
                'auth_token':        '/api/auth/token/',
                'auth_refresh':      '/api/auth/token/refresh/',
                'auth_esia':         '/api/auth/esia/',
                'me':                '/api/me/',
                'projects':          '/api/projects/',
                'project_team':      '/api/projects/{id}/team/',
                'project_documents': '/api/projects/{id}/documents/',
                'project_updates':   '/api/projects/{id}/updates/',
                'investments':       '/api/investments/',
                'support':           '/api/support/tickets/',
                'faq':               '/api/faq/',
                'notifications':     '/api/notifications/',
                'promotion_tiers':   '/api/promotion/tiers/',
                'buy_promotion':     '/api/projects/{id}/promote/',
                'admin':             '/admin/',
            }
        })
