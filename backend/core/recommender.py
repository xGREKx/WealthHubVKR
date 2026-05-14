"""
Рекомендательная подсистема Wealth Hub.

Содержит две функции:

1. assess_project_risk(project)
   Оценивает рискованность проекта по совокупности параметров (доходность,
   срок окупаемости, тип проекта, объём цели, минимум входа, размер команды,
   полнота документации). Используется при модерации: система предлагает
   администратору уровень риска, который тот может принять или скорректировать.

2. assess_attractiveness_for_investor(project, investor)
   Оценивает релевантность проекта для конкретного инвестора по его истории
   и профилю (риск-аппетит, отраслевые предпочтения, средний размер сделки,
   средняя ожидаемая доходность, доступный баланс) и атрибутам проекта.
   Используется на витрине: высокорелевантные проекты помечаются как
   «высокая привлекательность» и подсвечиваются акцентной рамкой.

Оба алгоритма — детерминированные эвристики на взвешенных правилах, без
обращений к ML-моделям, чтобы быть прозрачными для проверки и легко
объяснимыми пользователю.
"""
from __future__ import annotations

from collections import Counter
from decimal import Decimal
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from core.models import Project, User


# ============================================================================
# 1. РИСК ПРОЕКТА (для модератора)
# ============================================================================
#
# Каждый параметр проекта даёт «балл риска» от 0 до 2:
#   0 — низкий риск, 1 — средний, 2 — высокий.
# Балл умножается на вес параметра, сумма нормируется на сумму весов,
# результат отображается в категорию (low / medium / high) по порогам.
#
# Веса подобраны исходя из значимости: тип бизнеса и команда важнее, чем
# минимум входа. Сумма весов = 100 (удобно интерпретировать как проценты).
RISK_WEIGHTS = {
    'expected_return': 18,   # высокая доходность ⇒ выше риск
    'payback_years':   12,   # длинная окупаемость ⇒ выше риск
    'project_type':    22,   # стартап ⇒ выше; зрелая компания ⇒ ниже
    'goal_amount':     10,   # большая цель сбора ⇒ выше риск
    'min_investment':   8,   # высокий минимум ⇒ выше риск (концентрация)
    'team_size':       16,   # маленькая команда ⇒ выше риск
    'documents':       14,   # мало документов ⇒ выше риск
}

# Пороги для нормированного балла (sum/total_weight):
RISK_THRESHOLDS = {'low_max': 0.45, 'medium_max': 1.20}  # шкала 0..2


def _score_expected_return(value: Optional[Decimal]) -> int:
    if value is None:
        return 1
    v = float(value)
    if v < 15:
        return 0
    if v < 30:
        return 1
    return 2


def _score_payback_years(value: Optional[int]) -> int:
    if not value:
        return 1
    if value <= 2:
        return 0
    if value <= 4:
        return 1
    return 2


def _score_project_type(value: str) -> int:
    mapping = {
        'mature':       0,
        'traditional':  0,
        'expanding':    1,
        'crowdfunding': 2,
        'startup':      2,
    }
    return mapping.get(value, 1)


def _score_goal_amount(value: Optional[Decimal]) -> int:
    if value is None:
        return 1
    v = float(value)
    if v < 10_000_000:
        return 0
    if v < 50_000_000:
        return 1
    return 2


def _score_min_investment(value: Optional[Decimal]) -> int:
    if value is None:
        return 1
    v = float(value)
    if v < 100_000:
        return 0
    if v < 500_000:
        return 1
    return 2


def _score_team_size(count: int) -> int:
    if count >= 3:
        return 0
    if count >= 1:
        return 1
    return 2


def _score_documents(count: int) -> int:
    if count >= 3:
        return 0
    if count >= 1:
        return 1
    return 2


def assess_project_risk(project) -> dict:
    """
    Анализирует проект и возвращает рекомендованный уровень риска
    плюс расшифровку по каждому из семи факторов.

    Возвращает словарь:
        {
            'level':      'low' | 'medium' | 'high',
            'level_label': 'Низкий' | 'Средний' | 'Высокий',
            'score':       float,   # нормированный 0..2
            'factors': [
                {
                    'code':   'expected_return',
                    'label':  'Доходность',
                    'value':  '25.0 %',
                    'verdict':'medium',
                    'weight': 18,
                },
                ...
            ],
        }
    """
    factors_data = [
        ('expected_return', 'Доходность',          f'{project.expected_return} %',
         _score_expected_return(project.expected_return)),
        ('payback_years',   'Срок окупаемости',    f'{project.payback_years} г.',
         _score_payback_years(project.payback_years)),
        ('project_type',    'Тип бизнеса',         project.get_type_display() if hasattr(project, 'get_type_display') else project.type,
         _score_project_type(project.type)),
        ('goal_amount',     'Цель сбора',          f'{int(project.goal):,} ₽'.replace(',', ' '),
         _score_goal_amount(project.goal)),
        ('min_investment',  'Минимум входа',       f'{int(project.min_investment):,} ₽'.replace(',', ' '),
         _score_min_investment(project.min_investment)),
        ('team_size',       'Размер команды',      f'{project.team.count()} чел.',
         _score_team_size(project.team.count())),
        ('documents',       'Документы',           f'{project.documents.count()} шт.',
         _score_documents(project.documents.count())),
    ]

    total_score = 0
    total_weight = 0
    factors_out = []
    for code, label, value_str, raw_score in factors_data:
        weight = RISK_WEIGHTS[code]
        total_score += raw_score * weight
        total_weight += weight
        verdict = ('low', 'medium', 'high')[raw_score]
        factors_out.append({
            'code':    code,
            'label':   label,
            'value':   value_str,
            'verdict': verdict,
            'weight':  weight,
        })

    normalized = total_score / total_weight  # ∈ [0, 2]

    if normalized <= RISK_THRESHOLDS['low_max']:
        level = 'low'
        level_label = 'Низкий'
    elif normalized <= RISK_THRESHOLDS['medium_max']:
        level = 'medium'
        level_label = 'Средний'
    else:
        level = 'high'
        level_label = 'Высокий'

    return {
        'level':       level,
        'level_label': level_label,
        'score':       round(normalized, 2),
        'factors':     factors_out,
    }


# ============================================================================
# 2. ПРИВЛЕКАТЕЛЬНОСТЬ ПРОЕКТА ДЛЯ ИНВЕСТОРА (для витрины)
# ============================================================================
#
# Каждое правило даёт балл от 0 до 1 (или 0 / 1). Сумма весов = 100.
# Применяются content-based-сигналы из истории сделок инвестора.
# Если истории нет (cold start) — выдаётся нейтральный балл с базовым
# учётом доходности и собранности.

ATTRACT_WEIGHTS = {
    'industry_match':   25,  # отрасль входит в топ-3 интересов инвестора
    'risk_match':       20,  # риск проекта совпадает с предпочитаемым
    'budget_fit':       15,  # минимум входа доступен по балансу
    'return_quality':   15,  # доходность ≥ средней по портфелю инвестора
    'funding_traction': 10,  # проект уже собрал ≥ 40% цели — социальное доказательство
    'team_strength':    10,  # команда + документы оформлены
    'esia_status':       5,  # автор верифицирован через ЕСИА (доверие)
}

ATTRACT_THRESHOLDS = {'low_max': 0.40, 'medium_max': 0.65}  # шкала 0..1

# Соответствие риска проекта риску, который любит инвестор
# Используем простую дельту по шкале (low=0, medium=1, high=2):
_RISK_INDEX = {'low': 0, 'medium': 1, 'high': 2}


def _investor_profile(investor) -> dict:
    """
    Извлекает профиль инвестора из его истории:
      preferred_industries: top-3 по количеству сделок
      preferred_risk:       медиана риска по сделкам
      avg_amount:           средняя сумма сделки
      avg_return:           средняя доходность купленных долей
      balance:              доступный остаток на счёте
    """
    investments = investor.investments.select_related('project').all()

    industries = Counter(inv.project.industry for inv in investments if inv.project_id)
    top_industries = [name for name, _ in industries.most_common(3)]

    risk_counts = Counter(inv.risk_at_purchase for inv in investments if inv.risk_at_purchase)
    preferred_risk = risk_counts.most_common(1)[0][0] if risk_counts else None

    amounts = [float(inv.amount) for inv in investments]
    avg_amount = sum(amounts) / len(amounts) if amounts else 0.0

    returns = [float(inv.project.expected_return) for inv in investments if inv.project_id]
    avg_return = sum(returns) / len(returns) if returns else 0.0

    balance = float(getattr(getattr(investor, 'portfolio', None), 'balance', 0) or 0)

    return {
        'preferred_industries': top_industries,
        'preferred_risk':       preferred_risk,
        'avg_amount':           avg_amount,
        'avg_return':           avg_return,
        'balance':              balance,
        'has_history':          len(investments) > 0,
    }


def assess_attractiveness_for_investor(project, investor) -> dict:
    """
    Оценивает привлекательность проекта для конкретного инвестора.
    Возвращает структуру с уровнем и детализацией по факторам, аналогично
    assess_project_risk.

    Если инвестор не передан или ещё нет истории, расчёт строится только
    на универсальных сигналах (бюджет, доходность, собранность, команда),
    что даёт нейтральный результат — без накрутки до «высокой» из ничего.
    """
    profile = _investor_profile(investor) if investor and investor.is_authenticated else None
    has_profile = bool(profile and profile.get('has_history'))

    factors = []
    total_score = 0.0
    total_weight = 0

    # 1. Отрасль совпадает с предпочтениями
    if has_profile:
        prefers = profile['preferred_industries']
        match = project.industry in prefers
        score = 1.0 if match else 0.0
        verdict = 'high' if match else 'low'
        value = 'входит в топ-3' if match else 'вне топ-3'
    else:
        score = 0.5
        verdict = 'medium'
        value = 'нет истории'
    weight = ATTRACT_WEIGHTS['industry_match']
    total_score += score * weight
    total_weight += weight
    factors.append({'code': 'industry_match', 'label': 'Отраслевые предпочтения',
                    'value': value, 'verdict': verdict, 'weight': weight})

    # 2. Риск совпадает с предпочитаемым
    if has_profile and profile['preferred_risk'] and project.risk:
        delta = abs(_RISK_INDEX.get(project.risk, 1) - _RISK_INDEX.get(profile['preferred_risk'], 1))
        score = 1.0 if delta == 0 else 0.5 if delta == 1 else 0.0
        verdict = 'high' if delta == 0 else 'medium' if delta == 1 else 'low'
        value = 'совпадает' if delta == 0 else 'близок' if delta == 1 else 'не совпадает'
    else:
        score = 0.5
        verdict = 'medium'
        value = 'не определён'
    weight = ATTRACT_WEIGHTS['risk_match']
    total_score += score * weight
    total_weight += weight
    factors.append({'code': 'risk_match', 'label': 'Соответствие риск-профилю',
                    'value': value, 'verdict': verdict, 'weight': weight})

    # 3. Минимум входа доступен по балансу
    if profile and profile['balance'] > 0:
        min_inv = float(project.min_investment or 0)
        if min_inv <= profile['balance']:
            score = 1.0
            verdict = 'high'
            value = 'доступен'
        elif min_inv <= profile['balance'] * 2:
            score = 0.5
            verdict = 'medium'
            value = 'близок к лимиту'
        else:
            score = 0.0
            verdict = 'low'
            value = 'превышает баланс'
    else:
        score = 0.5
        verdict = 'medium'
        value = 'нет данных о балансе'
    weight = ATTRACT_WEIGHTS['budget_fit']
    total_score += score * weight
    total_weight += weight
    factors.append({'code': 'budget_fit', 'label': 'Бюджет инвестора',
                    'value': value, 'verdict': verdict, 'weight': weight})

    # 4. Доходность не ниже средней по портфелю
    proj_return = float(project.expected_return or 0)
    if has_profile and profile['avg_return'] > 0:
        if proj_return >= profile['avg_return']:
            score = 1.0
            verdict = 'high'
            value = f'≥ среднего ({profile["avg_return"]:.0f}%)'
        elif proj_return >= profile['avg_return'] * 0.8:
            score = 0.5
            verdict = 'medium'
            value = f'около среднего ({profile["avg_return"]:.0f}%)'
        else:
            score = 0.0
            verdict = 'low'
            value = f'< среднего ({profile["avg_return"]:.0f}%)'
    else:
        # Без истории — оцениваем абсолютно: > 20% это хорошо
        if proj_return >= 20:
            score = 1.0
            verdict = 'high'
            value = 'выше 20%'
        elif proj_return >= 12:
            score = 0.5
            verdict = 'medium'
            value = '12–20%'
        else:
            score = 0.2
            verdict = 'low'
            value = 'ниже 12%'
    weight = ATTRACT_WEIGHTS['return_quality']
    total_score += score * weight
    total_weight += weight
    factors.append({'code': 'return_quality', 'label': 'Уровень доходности',
                    'value': value, 'verdict': verdict, 'weight': weight})

    # 5. Социальное доказательство — раунд уже собрал
    if project.goal and float(project.goal) > 0:
        progress = float(project.raised) / float(project.goal)
        if progress >= 0.40:
            score = 1.0
            verdict = 'high'
            value = f'{int(progress * 100)}% собрано'
        elif progress >= 0.10:
            score = 0.5
            verdict = 'medium'
            value = f'{int(progress * 100)}% собрано'
        else:
            score = 0.2
            verdict = 'low'
            value = f'{int(progress * 100)}% собрано'
    else:
        score = 0.5
        verdict = 'medium'
        value = '—'
    weight = ATTRACT_WEIGHTS['funding_traction']
    total_score += score * weight
    total_weight += weight
    factors.append({'code': 'funding_traction', 'label': 'Сбор по проекту',
                    'value': value, 'verdict': verdict, 'weight': weight})

    # 6. Сила команды и документов
    team_n = project.team.count()
    docs_n = project.documents.count()
    if team_n >= 3 and docs_n >= 2:
        score, verdict, value = 1.0, 'high', f'{team_n} чел., {docs_n} док.'
    elif team_n >= 2 or docs_n >= 1:
        score, verdict, value = 0.6, 'medium', f'{team_n} чел., {docs_n} док.'
    else:
        score, verdict, value = 0.2, 'low', f'{team_n} чел., {docs_n} док.'
    weight = ATTRACT_WEIGHTS['team_strength']
    total_score += score * weight
    total_weight += weight
    factors.append({'code': 'team_strength', 'label': 'Команда и документы',
                    'value': value, 'verdict': verdict, 'weight': weight})

    # 7. Автор верифицирован через ЕСИА (доверие)
    owner = project.owner
    if owner and getattr(owner, 'verification_status', '') in ('verified_esia', 'verified_manual'):
        score, verdict, value = 1.0, 'high', 'верифицирован'
    else:
        score, verdict, value = 0.2, 'low', 'не верифицирован'
    weight = ATTRACT_WEIGHTS['esia_status']
    total_score += score * weight
    total_weight += weight
    factors.append({'code': 'esia_status', 'label': 'Статус автора',
                    'value': value, 'verdict': verdict, 'weight': weight})

    # Итог
    normalized = total_score / total_weight  # ∈ [0, 1]
    if normalized <= ATTRACT_THRESHOLDS['low_max']:
        level, level_label = 'low', 'Низкая'
    elif normalized <= ATTRACT_THRESHOLDS['medium_max']:
        level, level_label = 'medium', 'Средняя'
    else:
        level, level_label = 'high', 'Высокая'

    return {
        'level':       level,
        'level_label': level_label,
        'score':       round(normalized, 2),
        'factors':     factors,
        'personalized': has_profile,  # True если использовалась история инвестора
    }
