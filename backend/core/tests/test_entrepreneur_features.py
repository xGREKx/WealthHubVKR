"""
Тесты для двух новых фич страницы предпринимателя:

1. Параметр `?mine=1` в /api/projects/ — возвращает ВСЕ проекты текущего
   пользователя независимо от статуса (черновики, на модерации, активные,
   отклонённые). До добавления этого параметра предприниматель не видел
   свои одобренные проекты, потому что фронт фильтровал по полю owner,
   которого в ProjectListSerializer не было.

2. Эндпоинт /api/projects/<id>/investors/ — список инвесторов проекта
   с агрегированными вкладами и процентами. Доступен только владельцу
   проекта и администратору.
"""
from decimal import Decimal

from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Project
from .helpers import (
    make_investor, make_entrepreneur, make_admin, make_project,
    add_investment,
)


# ===========================================================================
# 1. /api/projects/?mine=1  — все мои проекты независимо от статуса
# ===========================================================================
class MineFilterTests(APITestCase):

    def setUp(self):
        self.owner       = make_entrepreneur(username='owner')
        self.other_owner = make_entrepreneur(username='other')
        self.investor    = make_investor()

        # У текущего пользователя проекты во всех 5 статусах
        self.draft     = make_project(owner=self.owner, name='Draft',
                                       status=Project.Status.DRAFT)
        self.pending   = make_project(owner=self.owner, name='Pending',
                                       status=Project.Status.PENDING)
        self.active    = make_project(owner=self.owner, name='Active',
                                       status=Project.Status.ACTIVE)
        self.rejected  = make_project(owner=self.owner, name='Rejected',
                                       status=Project.Status.REJECTED)
        self.closed    = make_project(owner=self.owner, name='Closed',
                                       status=Project.Status.CLOSED)

        # И «чужой» проект — он не должен попасть в ?mine=1
        self.other_active = make_project(owner=self.other_owner,
                                          name='OtherActive',
                                          status=Project.Status.ACTIVE)

    def _names(self, response):
        results = response.json()
        results = results.get('results', results) if isinstance(results, dict) else results
        return {p['name'] for p in results}

    def test_mine_param_returns_all_own_projects_regardless_of_status(self):
        """Главный фикс: предприниматель видит свои одобренные проекты тоже."""
        self.client.force_authenticate(user=self.owner)
        response = self.client.get('/api/projects/?mine=1&page_size=100')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = self._names(response)
        # ВСЕ свои проекты включая Active и Rejected
        self.assertIn('Draft',    names)
        self.assertIn('Pending',  names)
        self.assertIn('Active',   names)
        self.assertIn('Rejected', names)
        self.assertIn('Closed',   names)

    def test_mine_param_excludes_other_users_projects(self):
        """?mine=1 не должен возвращать чужие проекты."""
        self.client.force_authenticate(user=self.owner)
        response = self.client.get('/api/projects/?mine=1&page_size=100')
        names = self._names(response)
        self.assertNotIn('OtherActive', names)

    def test_list_serializer_exposes_owner_id(self):
        """
        Поле owner добавлено в ProjectListSerializer, чтобы фронт мог отличать
        свои проекты от чужих, даже если запросил общую витрину.
        """
        self.client.force_authenticate(user=self.owner)
        response = self.client.get('/api/projects/?mine=1&page_size=100').json()
        results = response.get('results', response)
        for project in results:
            self.assertIn('owner', project,
                          'Поле owner должно присутствовать в каждом проекте')

    def test_without_mine_entrepreneur_sees_own_plus_active(self):
        """Без ?mine=1 предприниматель видит свои + все active (рынок)."""
        self.client.force_authenticate(user=self.owner)
        response = self.client.get('/api/projects/?page_size=100')
        names = self._names(response)
        # Свои всех статусов + active чужих
        self.assertIn('Active', names)
        self.assertIn('OtherActive', names)
        self.assertIn('Draft', names)

    def test_investor_with_mine_sees_empty_list(self):
        """
        У инвестора нет своих проектов — ?mine=1 для него вернёт пустой список.
        """
        self.client.force_authenticate(user=self.investor)
        response = self.client.get('/api/projects/?mine=1')
        names = self._names(response)
        self.assertEqual(names, set())


# ===========================================================================
# 2. /api/projects/<id>/investors/  — список инвесторов с долями
# ===========================================================================
class InvestorsEndpointTests(APITestCase):

    def setUp(self):
        self.owner       = make_entrepreneur(username='proj_owner')
        self.other_owner = make_entrepreneur(username='other_owner')
        self.admin       = make_admin()
        self.outsider    = make_investor(username='outsider')

        self.project = make_project(
            owner=self.owner,
            status=Project.Status.ACTIVE,
            goal=Decimal('1000000'),
            risk=Project.Risk.MEDIUM,
        )

        # Три инвестора с разными суммами:
        # alice: 600 000 (60%), bob: 300 000 (30%), carol: 100 000 (10%)
        self.alice = make_investor(username='alice', balance='1000000',
                                    first_name_ru='Алиса', last_name_ru='Иванова')
        self.bob   = make_investor(username='bob',   balance='1000000',
                                    first_name_ru='Борис', last_name_ru='Петров')
        self.carol = make_investor(username='carol', balance='1000000',
                                    first_name_ru='Карина', last_name_ru='Смирнова',
                                    verified=False)

        add_investment(self.alice, self.project, amount='600000')
        add_investment(self.bob,   self.project, amount='300000')
        add_investment(self.carol, self.project, amount='100000')

        # Обновляю raised, как сделал бы реальный поток инвестирования
        self.project.raised = Decimal('1000000')
        self.project.save()

        self.url = f'/api/projects/{self.project.id}/investors/'

    # --- Доступ ----------------------------------------------------------------

    def test_anonymous_cannot_access(self):
        response = self.client.get(self.url)
        self.assertIn(response.status_code,
                      (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_other_user_cannot_access(self):
        """Случайный инвестор не должен видеть инвесторов чужого проекта."""
        self.client.force_authenticate(user=self.outsider)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_other_entrepreneur_cannot_access(self):
        self.client.force_authenticate(user=self.other_owner)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_can_access(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_can_access(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # --- Содержимое ответа -----------------------------------------------------

    def test_response_structure(self):
        self.client.force_authenticate(user=self.owner)
        body = self.client.get(self.url).json()
        for key in ('project_id', 'project_name', 'total_raised',
                    'investors_count', 'investors'):
            self.assertIn(key, body)
        self.assertEqual(body['investors_count'], 3)
        self.assertEqual(body['project_name'], self.project.name)

    def test_investors_sorted_by_amount_desc(self):
        """Самый крупный инвестор — на первом месте."""
        self.client.force_authenticate(user=self.owner)
        body = self.client.get(self.url).json()
        names = [inv['full_name'] for inv in body['investors']]
        self.assertEqual(names[0], 'Иванова Алиса')   # 60%
        self.assertEqual(names[1], 'Петров Борис')     # 30%
        self.assertEqual(names[2], 'Смирнова Карина')  # 10%

    def test_share_percentages_are_correct(self):
        """Проценты долей рассчитываются как amount / total_raised × 100."""
        self.client.force_authenticate(user=self.owner)
        body = self.client.get(self.url).json()
        shares = {inv['full_name']: inv['share_pct'] for inv in body['investors']}
        self.assertAlmostEqual(shares['Иванова Алиса'],   60.0, places=1)
        self.assertAlmostEqual(shares['Петров Борис'],    30.0, places=1)
        self.assertAlmostEqual(shares['Смирнова Карина'], 10.0, places=1)

    def test_share_percentages_sum_to_100(self):
        """Сумма всех долей = 100% (по одному проекту)."""
        self.client.force_authenticate(user=self.owner)
        body = self.client.get(self.url).json()
        total = sum(inv['share_pct'] for inv in body['investors'])
        self.assertAlmostEqual(total, 100.0, places=1)

    def test_esia_status_exposed(self):
        """Поле esia_verified показывает, прошёл ли инвестор ЕСИА."""
        self.client.force_authenticate(user=self.owner)
        body = self.client.get(self.url).json()
        by_name = {inv['full_name']: inv for inv in body['investors']}
        self.assertTrue(by_name['Иванова Алиса']['esia_verified'])
        self.assertFalse(by_name['Смирнова Карина']['esia_verified'])

    def test_aggregates_multiple_investments_of_one_user(self):
        """
        Если один инвестор сделал несколько вкладов в проект, они
        суммируются в одну строку с общей суммой и долей.
        """
        # alice докладывает ещё 100 000 — должна стать 700 000 (≈63.6%)
        add_investment(self.alice, self.project, amount='100000')
        self.project.raised = Decimal('1100000')
        self.project.save()

        self.client.force_authenticate(user=self.owner)
        body = self.client.get(self.url).json()
        self.assertEqual(body['investors_count'], 3)  # всё ещё 3 уникальных
        alice_row = next(i for i in body['investors'] if i['full_name'] == 'Иванова Алиса')
        self.assertEqual(Decimal(str(alice_row['amount'])), Decimal('700000'))

    def test_empty_project_returns_empty_list(self):
        """Для проекта без инвестиций возвращается пустой список."""
        empty_project = make_project(owner=self.owner, name='Empty',
                                      status=Project.Status.ACTIVE)
        self.client.force_authenticate(user=self.owner)
        body = self.client.get(f'/api/projects/{empty_project.id}/investors/').json()
        self.assertEqual(body['investors_count'], 0)
        self.assertEqual(body['investors'], [])
