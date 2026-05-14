"""
Unit-тесты рекомендательной подсистемы (core/recommender.py).

Проверяем две функции:
  1. assess_project_risk        — оценка рискованности проекта по параметрам;
  2. assess_attractiveness_for_investor — релевантность проекта инвестору.

Тесты детерминированы, чёрного ящика, не зависят друг от друга. Сторонние
библиотеки не нужны — только встроенный Django TestCase.
"""
from decimal import Decimal

from django.test import TestCase

from core.models import Project
from core.recommender import (
    assess_project_risk,
    assess_attractiveness_for_investor,
)
from .helpers import (
    make_investor, make_entrepreneur, make_project,
    add_team, add_documents, add_investment,
)


# ===========================================================================
# 1. ОЦЕНКА РИСКА ПРОЕКТА
# ===========================================================================
class AssessProjectRiskTests(TestCase):

    def setUp(self):
        self.owner = make_entrepreneur()

    # --- Категории и базовая структура ответа ----------------------------------

    def test_returns_expected_keys(self):
        """Ответ функции содержит все ожидаемые поля и 7 факторов."""
        project = make_project(owner=self.owner)
        result = assess_project_risk(project)

        self.assertIn('level', result)
        self.assertIn('level_label', result)
        self.assertIn('score', result)
        self.assertIn('factors', result)
        self.assertEqual(len(result['factors']), 7)
        for factor in result['factors']:
            self.assertIn('code',    factor)
            self.assertIn('label',   factor)
            self.assertIn('value',   factor)
            self.assertIn('verdict', factor)
            self.assertIn('weight',  factor)
            self.assertIn(factor['verdict'], ('low', 'medium', 'high'))

    def test_total_weights_sum_to_100(self):
        """Сумма весов факторов = 100 (инвариант, делает score интерпретируемым)."""
        project = make_project(owner=self.owner)
        result = assess_project_risk(project)
        total = sum(f['weight'] for f in result['factors'])
        self.assertEqual(total, 100)

    # --- Граничные кейсы (низкий/высокий риск) ---------------------------------

    def test_low_risk_for_mature_well_documented_project(self):
        """
        Зрелая компания, низкая доходность, короткая окупаемость, большая команда
        и полная документация — система должна предложить низкий риск.
        """
        project = make_project(
            owner=self.owner,
            type=Project.Type.MATURE,
            expected_return=Decimal('12'),
            payback_years=2,
            goal=Decimal('5000000'),
            min_investment=Decimal('50000'),
        )
        add_team(project, count=5)
        add_documents(project, count=4)

        result = assess_project_risk(project)
        self.assertEqual(result['level'], 'low')
        self.assertEqual(result['level_label'], 'Низкий')

    def test_high_risk_for_aggressive_startup(self):
        """
        Стартап, высокая доходность, длинная окупаемость, нет команды,
        нет документов, большая цель сбора — высокий риск.
        """
        project = make_project(
            owner=self.owner,
            type=Project.Type.STARTUP,
            expected_return=Decimal('45'),
            payback_years=7,
            goal=Decimal('80000000'),
            min_investment=Decimal('1000000'),
        )
        # ни команды, ни документов

        result = assess_project_risk(project)
        self.assertEqual(result['level'], 'high')

    def test_medium_risk_for_balanced_expanding_project(self):
        """
        Расширяющийся бизнес, умеренная доходность, средняя окупаемость,
        нормальная команда и документы — средний риск.
        """
        project = make_project(
            owner=self.owner,
            type=Project.Type.EXPANDING,
            expected_return=Decimal('26'),
            payback_years=3,
            goal=Decimal('15000000'),
            min_investment=Decimal('100000'),
        )
        add_team(project, count=4)
        add_documents(project, count=3)

        result = assess_project_risk(project)
        self.assertEqual(result['level'], 'medium')

    # --- Влияние отдельных факторов --------------------------------------------

    def test_team_and_documents_reduce_risk(self):
        """Добавление команды и документов снижает балл риска."""
        project = make_project(
            owner=self.owner,
            type=Project.Type.STARTUP,  # фикс: тип не должен меняться между сравнениями
            expected_return=Decimal('25'),
            payback_years=4,
        )
        before = assess_project_risk(project)

        add_team(project, count=5)
        add_documents(project, count=4)

        after = assess_project_risk(project)
        self.assertLess(after['score'], before['score'],
                        'Команда и документы должны снижать балл риска')

    def test_higher_expected_return_increases_risk(self):
        """Чем выше доходность, тем выше предлагаемый риск."""
        low_return = make_project(owner=self.owner, expected_return=Decimal('10'))
        high_return = make_project(owner=self.owner, expected_return=Decimal('45'))

        score_low  = assess_project_risk(low_return)['score']
        score_high = assess_project_risk(high_return)['score']
        self.assertLess(score_low, score_high)


# ===========================================================================
# 2. ПРИВЛЕКАТЕЛЬНОСТЬ ДЛЯ ИНВЕСТОРА
# ===========================================================================
class AssessAttractivenessTests(TestCase):

    def setUp(self):
        self.owner = make_entrepreneur()

    # --- Структура ответа ------------------------------------------------------

    def test_returns_expected_keys_and_seven_factors(self):
        project = make_project(owner=self.owner)
        result = assess_attractiveness_for_investor(project, None)

        self.assertIn('level', result)
        self.assertIn('score', result)
        self.assertIn('factors', result)
        self.assertIn('personalized', result)
        self.assertEqual(len(result['factors']), 7)

    def test_weights_sum_to_100(self):
        project = make_project(owner=self.owner)
        result = assess_attractiveness_for_investor(project, None)
        total = sum(f['weight'] for f in result['factors'])
        self.assertEqual(total, 100)

    # --- Cold start: инвестор без истории --------------------------------------

    def test_cold_start_is_not_personalized(self):
        """Если инвестор не передан — оценка идёт по универсальным сигналам."""
        project = make_project(owner=self.owner)
        result = assess_attractiveness_for_investor(project, None)
        self.assertFalse(result['personalized'])

    def test_anonymous_user_treated_as_cold_start(self):
        """AnonymousUser → флаг personalized=False."""
        from django.contrib.auth.models import AnonymousUser
        project = make_project(owner=self.owner)
        result = assess_attractiveness_for_investor(project, AnonymousUser())
        self.assertFalse(result['personalized'])

    def test_investor_without_history_is_not_personalized(self):
        """Инвестор без сделок ещё не имеет профиля."""
        investor = make_investor()
        project = make_project(owner=self.owner)
        result = assess_attractiveness_for_investor(project, investor)
        self.assertFalse(result['personalized'])

    # --- Профилизация по истории ----------------------------------------------

    def test_industry_match_boosts_attractiveness(self):
        """
        Инвестор инвестировал в IT и FinTech, новый проект тоже FinTech —
        фактор industry_match должен быть 'high'.
        """
        investor = make_investor()

        # История: 2 FinTech-проекта, 1 IT-проект
        for industry in (Project.Industry.FINTECH, Project.Industry.FINTECH,
                         Project.Industry.IT):
            past = make_project(owner=self.owner, industry=industry,
                                risk=Project.Risk.MEDIUM,
                                expected_return=Decimal('25'))
            add_investment(investor, past)

        new_project = make_project(owner=self.owner,
                                    industry=Project.Industry.FINTECH,
                                    risk=Project.Risk.MEDIUM,
                                    expected_return=Decimal('25'))
        result = assess_attractiveness_for_investor(new_project, investor)

        industry_factor = next(f for f in result['factors'] if f['code'] == 'industry_match')
        self.assertEqual(industry_factor['verdict'], 'high')
        self.assertTrue(result['personalized'])

    def test_industry_mismatch_lowers_attractiveness(self):
        """Если новый проект — в чужой отрасли, фактор industry_match='low'."""
        investor = make_investor()
        # Инвестор любит fintech
        for _ in range(3):
            past = make_project(owner=self.owner, industry=Project.Industry.FINTECH,
                                risk=Project.Risk.LOW, expected_return=Decimal('20'))
            add_investment(investor, past)

        # А новый проект — туризм
        new_project = make_project(owner=self.owner,
                                    industry=Project.Industry.TOURISM)
        result = assess_attractiveness_for_investor(new_project, investor)
        industry_factor = next(f for f in result['factors'] if f['code'] == 'industry_match')
        self.assertEqual(industry_factor['verdict'], 'low')

    def test_risk_profile_match(self):
        """Если у инвестора любимый риск = medium, и проект тоже medium — high."""
        investor = make_investor()
        for _ in range(3):
            past = make_project(owner=self.owner,
                                industry=Project.Industry.FINTECH,
                                risk=Project.Risk.MEDIUM,
                                expected_return=Decimal('25'))
            add_investment(investor, past)

        new_project = make_project(owner=self.owner,
                                    industry=Project.Industry.FINTECH,
                                    risk=Project.Risk.MEDIUM)
        result = assess_attractiveness_for_investor(new_project, investor)
        risk_factor = next(f for f in result['factors'] if f['code'] == 'risk_match')
        self.assertEqual(risk_factor['verdict'], 'high')

    def test_budget_fit_for_affordable_minimum(self):
        """Минимум входа намного меньше баланса — фактор 'high'."""
        investor = make_investor(balance='5000000')
        project = make_project(owner=self.owner, min_investment=Decimal('100000'))
        result = assess_attractiveness_for_investor(project, investor)
        bf = next(f for f in result['factors'] if f['code'] == 'budget_fit')
        self.assertEqual(bf['verdict'], 'high')

    def test_budget_fit_when_minimum_exceeds_balance(self):
        """Минимум входа превышает баланс — фактор 'low'."""
        investor = make_investor(balance='50000')
        project = make_project(owner=self.owner, min_investment=Decimal('500000'))
        result = assess_attractiveness_for_investor(project, investor)
        bf = next(f for f in result['factors'] if f['code'] == 'budget_fit')
        self.assertEqual(bf['verdict'], 'low')

    def test_high_attractiveness_for_well_matching_project(self):
        """
        Проект совпадает с интересами инвестора по всем ключевым параметрам:
        отрасль, риск, доходность, бюджет — общий вердикт 'high'.
        """
        investor = make_investor(balance='5000000')
        # Аутентифицируем (для вызова user.is_authenticated)
        # помогает: AbstractUser — is_authenticated=True всегда.
        # История 3 fintech-проекта medium-risk, доходность 25%
        for _ in range(3):
            past = make_project(owner=self.owner,
                                industry=Project.Industry.FINTECH,
                                risk=Project.Risk.MEDIUM,
                                expected_return=Decimal('25'),
                                min_investment=Decimal('100000'))
            add_investment(investor, past, amount='100000')

        # Сильный новый проект
        strong = make_project(owner=self.owner,
                              industry=Project.Industry.FINTECH,
                              type=Project.Type.EXPANDING,
                              risk=Project.Risk.MEDIUM,
                              expected_return=Decimal('27'),
                              min_investment=Decimal('100000'),
                              raised=Decimal('0'))
        add_team(strong, count=4)
        add_documents(strong, count=3)

        result = assess_attractiveness_for_investor(strong, investor)
        self.assertEqual(result['level'], 'high')
        self.assertTrue(result['personalized'])

    def test_low_attractiveness_for_completely_mismatching_project(self):
        """
        Инвестор предпочитает low-risk fintech, новый проект — high-risk
        туризм с минимумом выше баланса. Итог 'low'.
        """
        investor = make_investor(balance='100000')
        for _ in range(3):
            past = make_project(owner=self.owner,
                                industry=Project.Industry.FINTECH,
                                risk=Project.Risk.LOW,
                                expected_return=Decimal('15'))
            add_investment(investor, past, amount='50000')

        weak = make_project(owner=self.owner,
                             industry=Project.Industry.TOURISM,
                             risk=Project.Risk.HIGH,
                             expected_return=Decimal('10'),
                             min_investment=Decimal('1000000'))
        # без команды, без документов
        result = assess_attractiveness_for_investor(weak, investor)
        self.assertEqual(result['level'], 'low')

    # --- Социальные сигналы ----------------------------------------------------

    def test_high_funding_traction_is_high(self):
        """Если собрано ≥ 40% — fund_traction='high'."""
        project = make_project(owner=self.owner,
                                goal=Decimal('1000000'),
                                raised=Decimal('500000'))
        result = assess_attractiveness_for_investor(project, None)
        ft = next(f for f in result['factors'] if f['code'] == 'funding_traction')
        self.assertEqual(ft['verdict'], 'high')

    def test_team_strength_factor(self):
        """Сильная команда + 2+ документа → team_strength='high'."""
        project = make_project(owner=self.owner)
        add_team(project, count=4)
        add_documents(project, count=3)
        result = assess_attractiveness_for_investor(project, None)
        ts = next(f for f in result['factors'] if f['code'] == 'team_strength')
        self.assertEqual(ts['verdict'], 'high')

    def test_owner_verified_via_esia_gives_high_trust(self):
        """Автор верифицирован → фактор 'high'."""
        verified_owner = make_entrepreneur(username='owner-esia', verified=True)
        project = make_project(owner=verified_owner)
        result = assess_attractiveness_for_investor(project, None)
        esia = next(f for f in result['factors'] if f['code'] == 'esia_status')
        self.assertEqual(esia['verdict'], 'high')

    def test_owner_not_verified_gives_low_trust(self):
        """Автор НЕ верифицирован → фактор 'low'."""
        unverified = make_entrepreneur(username='owner-noesia', verified=False)
        project = make_project(owner=unverified)
        result = assess_attractiveness_for_investor(project, None)
        esia = next(f for f in result['factors'] if f['code'] == 'esia_status')
        self.assertEqual(esia['verdict'], 'low')
