"""
Smoke-тест эталонного демо-проекта 'InvestFlow PRO'.

Этот проект добавлен в seed_data.py специально для презентации фичи —
он должен после загрузки данных:
  1. существовать в БД со статусом PENDING (на модерации);
  2. получать от рекомендательной подсистемы уровень риска MEDIUM;
  3. для demo_investor быть HIGH-attractive с флагом personalized=True.

Если кто-то случайно изменит параметры демо-проекта или формулы расчёта —
тест сразу подсветит регрессию.
"""
from django.core.management import call_command
from django.test import TestCase

from core.models import User, Project
from core.recommender import (
    assess_project_risk,
    assess_attractiveness_for_investor,
)


class SeedDataDemoProjectTests(TestCase):
    """Тест работает на изолированной тестовой БД, прогоняет seed_data."""

    @classmethod
    def setUpTestData(cls):
        # Заполняем БД стартовыми данными (создаст demo_investor с историей,
        # demo_owner и тестовый InvestFlow PRO на модерации).
        call_command('seed_data', verbosity=0)

    def test_demo_project_exists_and_is_pending(self):
        project = Project.objects.filter(name='InvestFlow PRO').first()
        self.assertIsNotNone(project, "InvestFlow PRO должен быть создан seed_data")
        self.assertEqual(project.status, Project.Status.PENDING,
                         "InvestFlow PRO должен быть на модерации (статус pending)")

    def test_demo_project_has_team_and_documents(self):
        """Контентная полнота: 4 человека в команде и 3 документа."""
        project = Project.objects.get(name='InvestFlow PRO')
        self.assertEqual(project.team.count(), 4)
        self.assertEqual(project.documents.count(), 3)

    def test_recommender_proposes_medium_risk(self):
        """Главное обещание фичи: система предлагает СРЕДНИЙ риск."""
        project = Project.objects.get(name='InvestFlow PRO')
        result = assess_project_risk(project)
        self.assertEqual(
            result['level'], 'medium',
            f"Ожидался средний риск, получили {result['level']} "
            f"(score={result['score']}). Проверьте параметры проекта или "
            f"веса в recommender.RISK_WEIGHTS."
        )

    def test_recommender_high_attractiveness_for_demo_investor(self):
        """Второе обещание: для demo_investor проект — высоко привлекательный."""
        demo_investor = User.objects.get(username='demo_investor')
        project = Project.objects.get(name='InvestFlow PRO')
        result = assess_attractiveness_for_investor(project, demo_investor)

        self.assertTrue(
            result['personalized'],
            "Расчёт должен использовать историю demo_investor (personalized=True)",
        )
        self.assertEqual(
            result['level'], 'high',
            f"Ожидалась высокая привлекательность, получили {result['level']} "
            f"(score={result['score']}). Проверьте отрасли/риск-аппетит "
            f"demo_investor или веса в recommender.ATTRACT_WEIGHTS."
        )

    def test_demo_investor_history_alignment(self):
        """
        Контроль предусловий теста выше: demo_investor должен инвестировать
        преимущественно в fintech и medium-risk. Если когда-то изменят seed_data —
        этот тест явно покажет, что предположения сломались.
        """
        demo_investor = User.objects.get(username='demo_investor')
        investments = demo_investor.investments.select_related('project').all()
        self.assertGreaterEqual(investments.count(), 3)

        industries = [inv.project.industry for inv in investments]
        # Хотя бы один fintech-проект должен быть в истории
        self.assertIn('fintech', industries)
