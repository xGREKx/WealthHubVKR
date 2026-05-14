from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    RegistrationView, LoginView, ESIAAuthView, MeView,
    RegenerateApiTokenView, PortfolioView, VerifyViaESIAView, SubmitForVerificationView,
    ProjectViewSet, InvestmentViewSet, TeamMemberViewSet, DocumentViewSet,
    TransactionListView, DividendListView,
    SupportTicketViewSet, FAQListView,
    NotificationViewSet, AdminUserViewSet,
    PromotionTiersView, BuyPromotionView,
)


router = DefaultRouter()
router.register(r'projects',          ProjectViewSet,       basename='project')
router.register(r'investments',       InvestmentViewSet,    basename='investment')
router.register(r'support/tickets',   SupportTicketViewSet, basename='support_ticket')
router.register(r'notifications',     NotificationViewSet,  basename='notification')
router.register(r'admin/users',       AdminUserViewSet,     basename='admin_user')


urlpatterns = [
    # Аутентификация
    path('auth/register/',         RegistrationView.as_view(),         name='register'),
    path('auth/login/',            LoginView.as_view(),                name='login'),
    path('auth/esia/',             ESIAAuthView.as_view(),             name='esia_auth'),

    # Профиль
    path('me/',                    MeView.as_view(),                   name='me'),
    path('me/regenerate-token/',   RegenerateApiTokenView.as_view(),   name='regenerate_token'),
    path('me/portfolio/',          PortfolioView.as_view(),            name='portfolio'),
    path('me/verify-esia/',        VerifyViaESIAView.as_view(),        name='verify_esia'),
    path('me/submit-verification/',SubmitForVerificationView.as_view(),name='submit_verification'),

    # Финансы
    path('transactions/',          TransactionListView.as_view(),      name='transactions'),
    path('dividends/',             DividendListView.as_view(),         name='dividends'),

    # FAQ
    path('faq/',                   FAQListView.as_view(),              name='faq'),

    # Команда проекта (вложенные эндпоинты под /projects/{id}/)
    path('projects/<uuid:project_pk>/team/',
         TeamMemberViewSet.as_view({'get': 'list', 'post': 'create'}), name='project_team_list'),
    path('projects/<uuid:project_pk>/team/<int:pk>/',
         TeamMemberViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'}),
         name='project_team_detail'),

    # Документы проекта
    path('projects/<uuid:project_pk>/documents/',
         DocumentViewSet.as_view({'get': 'list', 'post': 'create'}), name='project_documents_list'),
    path('projects/<uuid:project_pk>/documents/<int:pk>/',
         DocumentViewSet.as_view({'delete': 'destroy'}), name='project_document_detail'),

    # Продвижение
    path('promotion/tiers/',                 PromotionTiersView.as_view(), name='promotion_tiers'),
    path('projects/<uuid:project_id>/promote/', BuyPromotionView.as_view(), name='buy_promotion'),

    # Роутер
    path('', include(router.urls)),
]
