"""
Integration-тесты для API рекомендательной подсистемы.

Тестируем эндпоинт /api/projects/<id>/recommendation/ — он должен:
  • быть доступен только администраторам (IsAdmin),
  • возвращать структуру { risk, attractiveness_preview },
  • корректно работать на проекте на модерации.

И отдельно — динамическое поле attractiveness в /api/projects/ (список):
  • для инвестора пересчитывается на основе его профиля,
  • для анонима — отдаётся значение, выставленное модератором.
"""
from decimal import Decimal

from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Project
from .helpers import (
    make_investor, make_entrepreneur, make_admin, make_project,
    add_team, add_documents, add_investment,
)


class RecommendationEndpointTests(APITestCase):
    """Проверка эндпоинта /api/projects/<id>/recommendation/."""

    def setUp(self):
        self.owner = make_entrepreneur()
        self.admin = make_admin()
        self.investor = make_investor()

        self.project = make_project(
            owner=self.owner,
            status=Project.Status.PENDING,
            industry=Project.Industry.FINTECH,
            type=Project.Type.EXPANDING,
            expected_return=Decimal('26'),
            payback_years=3,
            goal=Decimal('15000000'),
            min_investment=Decimal('100000'),
        )
        add_team(self.project, count=4)
        add_documents(self.project, count=3)

        self.url = f'/api/projects/{self.project.id}/recommendation/'

    # --- Доступ ----------------------------------------------------------------

    def test_anonymous_user_cannot_access(self):
        response = self.client.get(self.url)
        self.assertIn(response.status_code,
                      (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_investor_cannot_access(self):
        self.client.force_authenticate(user=self.investor)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_entrepreneur_cannot_access(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_access(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # --- Содержимое ответа ----------------------------------------------------

    def test_response_has_risk_and_attractiveness_keys(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.url)
        body = response.json()

        self.assertIn('risk', body)
        self.assertIn('attractiveness_preview', body)

    def test_risk_payload_structure(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.url).json()
        risk = response['risk']

        for key in ('level', 'level_label', 'score', 'factors'):
            self.assertIn(key, risk)
        self.assertIn(risk['level'], ('low', 'medium', 'high'))
        self.assertEqual(len(risk['factors']), 7)
        # Сумма весов = 100 — инвариант, который держит расчёт интерпретируемым
        self.assertEqual(sum(f['weight'] for f in risk['factors']), 100)

    def test_attractiveness_preview_structure(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.url).json()
        attract = response['attractiveness_preview']
        for key in ('level', 'level_label', 'score', 'factors', 'personalized'):
            self.assertIn(key, attract)
        # На странице модерации показывается базовая оценка без истории инвестора
        self.assertFalse(attract['personalized'])

    def test_returns_404_for_missing_project(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/projects/00000000-0000-0000-0000-000000000000/recommendation/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class MarketplaceDynamicAttractivenessTests(APITestCase):
    """
    Динамическое поле attractiveness и is_recommended в /api/projects/.
    Проверяем, что списки витрины подстраиваются под инвестора.
    """

    def setUp(self):
        self.owner    = make_entrepreneur()
        self.investor = make_investor(balance='5000000')

        # Профиль инвестора: 3 fintech-сделки medium-risk @ 25%
        for _ in range(3):
            past = make_project(
                owner=self.owner,
                industry=Project.Industry.FINTECH,
                risk=Project.Risk.MEDIUM,
                expected_return=Decimal('25'),
                status=Project.Status.ACTIVE,
            )
            add_investment(self.investor, past, amount='200000')

        # Сильный matching-проект
        self.strong = make_project(
            owner=self.owner,
            name='Strong Match',
            industry=Project.Industry.FINTECH,
            type=Project.Type.EXPANDING,
            risk=Project.Risk.MEDIUM,
            expected_return=Decimal('27'),
            min_investment=Decimal('100000'),
            status=Project.Status.ACTIVE,
            attractiveness='low',  # модератор поставил «low» — система должна перебить
        )
        add_team(self.strong, count=4)
        add_documents(self.strong, count=3)

        # Слабый mismatch-проект
        self.weak = make_project(
            owner=self.owner,
            name='Weak Match',
            industry=Project.Industry.TOURISM,
            risk=Project.Risk.HIGH,
            expected_return=Decimal('10'),
            min_investment=Decimal('1000000'),
            status=Project.Status.ACTIVE,
            attractiveness='high',  # модератор поставил «high» — система должна понизить
        )

    def _find(self, payload, name):
        results = payload if isinstance(payload, list) else payload.get('results', payload)
        return next((p for p in results if p['name'] == name), None)

    def test_strong_match_is_recommended_for_investor(self):
        """Для авторизованного инвестора strong-проект помечен is_recommended=True."""
        self.client.force_authenticate(user=self.investor)
        response = self.client.get('/api/projects/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        strong = self._find(response.json(), 'Strong Match')
        self.assertIsNotNone(strong)
        self.assertEqual(strong['attractiveness'], 'high')
        self.assertTrue(strong['is_recommended'])

    def test_weak_match_is_not_recommended_for_investor(self):
        """Слабый mismatch — is_recommended=False, attractiveness понижена."""
        self.client.force_authenticate(user=self.investor)
        response = self.client.get('/api/projects/')
        weak = self._find(response.json(), 'Weak Match')
        self.assertIsNotNone(weak)
        self.assertFalse(weak['is_recommended'])
        self.assertNotEqual(weak['attractiveness'], 'high')

    def test_anonymous_user_sees_stored_attractiveness(self):
        """Для анонима возвращается то значение, которое поставил модератор."""
        response = self.client.get('/api/projects/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        strong = self._find(response.json(), 'Strong Match')
        self.assertIsNotNone(strong)
        # Для анонима is_recommended всегда False (нет персонализации)
        self.assertFalse(strong['is_recommended'])
        # И attractiveness — то, что сохранил модератор
        self.assertEqual(strong['attractiveness'], 'low')
