"""
Помощники для тестов: фабрики моделей с разумными значениями по умолчанию.

Не используем сторонние библиотеки (factory_boy и пр.) — Django и DRF из коробки
дают всё необходимое.
"""
from decimal import Decimal
from datetime import timedelta

from django.utils import timezone

from core.models import (
    User, Portfolio, Project, TeamMember, Document, Investment,
)


# ---------------------------------------------------------------------------
# Пользователи
# ---------------------------------------------------------------------------
def make_user(username='user1', role=User.Role.INVESTOR,
              verified=True, balance='1000000', password='pass12345',
              **extra):
    """Создаёт пользователя с заполненным портфелем."""
    defaults = {
        'username':            username,
        'role':                role,
        'email':               f'{username}@test.local',
        'verification_status': (User.VerificationStatus.VERIFIED_ESIA
                                if verified else User.VerificationStatus.NOT_VERIFIED),
        'registered_via_esia': verified,
        'e_signature_status':  (User.ESignatureStatus.VERIFIED
                                if verified else User.ESignatureStatus.NONE),
    }
    defaults.update(extra)
    user = User.objects.create(**defaults)
    user.set_password(password)
    user.save()
    Portfolio.objects.update_or_create(
        user=user,
        defaults={'balance': Decimal(str(balance))},
    )
    return user


def make_investor(username='investor', balance='2000000', **extra):
    return make_user(username=username, role=User.Role.INVESTOR, balance=balance, **extra)


def make_entrepreneur(username='owner', **extra):
    return make_user(username=username, role=User.Role.ENTREPRENEUR, **extra)


def make_admin(username='admin', **extra):
    return make_user(username=username, role=User.Role.ADMIN,
                     is_staff=True, is_superuser=True, **extra)


# ---------------------------------------------------------------------------
# Проекты
# ---------------------------------------------------------------------------
def make_project(owner=None, **overrides):
    """
    Создаёт проект с настройками «по умолчанию = средний риск, fintech, expanding».
    Любое поле можно переопределить через kwargs.

    Команда и документы по умолчанию НЕ создаются — это нужно делать явно
    через add_team()/add_documents(), чтобы в тестах было видно, как параметр
    влияет на оценку.
    """
    if owner is None:
        owner = make_entrepreneur()

    defaults = {
        'owner':           owner,
        'name':            f'TestProject-{Project.objects.count()}',
        'slogan':          'Тестовый проект',
        'description':     'Описание тестового проекта для unit-тестов.',
        'industry':        Project.Industry.FINTECH,
        'type':            Project.Type.EXPANDING,
        'geography':       'Москва',
        'goal':            Decimal('15000000'),
        'raised':          Decimal('0'),
        'min_investment':  Decimal('100000'),
        'expected_return': Decimal('25'),
        'payback_years':   3,
        'closing_date':    timezone.now().date() + timedelta(days=90),
        'risk':            '',
        'attractiveness':  '',
        'status':          Project.Status.PENDING,
    }
    defaults.update(overrides)
    return Project.objects.create(**defaults)


def add_team(project, count=3):
    """Добавляет N-членов команды в проект."""
    for i in range(count):
        TeamMember.objects.create(
            project=project,
            name=f'Member {i+1}',
            role=f'Role {i+1}',
            bio=f'Опытный специалист {i+1} с 10-летним стажем в индустрии.',
        )


def add_documents(project, count=3):
    """Добавляет N-документов (без реальных файлов)."""
    types = [
        Document.Type.BUSINESS_PLAN,
        Document.Type.FINANCIAL_MODEL,
        Document.Type.PRESENTATION,
        Document.Type.OTHER,
    ]
    for i in range(count):
        Document.objects.create(
            project=project,
            name=f'doc-{i+1}.pdf',
            type=types[i % len(types)],
            size_bytes=1024 * (i + 1),
        )


def add_investment(investor, project, amount='100000'):
    """Создаёт инвестицию (с дисклеймером и подписью), обновляет портфель."""
    amt = Decimal(str(amount))
    inv = Investment.objects.create(
        investor=investor,
        project=project,
        amount=amt,
        share_percent=(amt / project.goal) * 100,
        risk_at_purchase=project.risk or Project.Risk.MEDIUM,
        risk_disclaimer_accepted=True,
    )
    portfolio = investor.portfolio
    portfolio.invested = (portfolio.invested or Decimal('0')) + amt
    portfolio.balance  = (portfolio.balance  or Decimal('0')) - amt
    portfolio.save()
    return inv
