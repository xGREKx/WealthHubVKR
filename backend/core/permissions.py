"""Кастомные права доступа Wealth Hub."""
from rest_framework import permissions


class IsInvestor(permissions.BasePermission):
    message = 'Доступ только для пользователей с ролью «Инвестор».'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'investor')


class IsEntrepreneur(permissions.BasePermission):
    message = 'Доступ только для пользователей с ролью «Предприниматель».'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'entrepreneur')


class IsAdmin(permissions.BasePermission):
    message = 'Доступ только для администраторов платформы.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'admin')


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Изменять может только владелец проекта."""
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.owner_id == request.user.id
