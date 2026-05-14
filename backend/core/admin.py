"""Регистрация моделей в Django admin."""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, Portfolio, Project, TeamMember, Document, Investment, Transaction,
    SupportTicket, SupportMessage, FAQEntry, Notification, DividendPayout,
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'role', 'full_name_ru', 'verification_status', 'e_signature_status', 'is_staff')
    list_filter  = ('role', 'verification_status', 'e_signature_status', 'is_staff')
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Роль и верификация', {'fields': ('role', 'e_signature_status', 'verification_status',
                                           'two_factor_enabled', 'api_token',
                                           'registered_via_esia')}),
        ('Персональные данные (RU)', {
            'fields': ('last_name_ru', 'first_name_ru', 'middle_name_ru',
                       'inn', 'passport', 'phone', 'avatar', 'esia_uid')
        }),
    )


class TeamMemberInline(admin.TabularInline):
    model = TeamMember
    extra = 0


class DocumentInline(admin.TabularInline):
    model = Document
    extra = 0


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display  = ('name', 'owner', 'industry', 'status', 'goal', 'raised', 'risk', 'attractiveness', 'promoted')
    list_filter   = ('status', 'industry', 'type', 'risk', 'promoted')
    search_fields = ('name', 'slogan', 'description')
    inlines       = [TeamMemberInline, DocumentInline]


@admin.register(Investment)
class InvestmentAdmin(admin.ModelAdmin):
    list_display  = ('investor', 'project', 'amount', 'share_percent', 'is_sold', 'created_at')
    list_filter   = ('risk_at_purchase', 'is_sold')
    search_fields = ('investor__username', 'project__name')


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('user', 'type', 'amount', 'status', 'created_at')
    list_filter  = ('type', 'status')


@admin.register(Portfolio)
class PortfolioAdmin(admin.ModelAdmin):
    list_display = ('user', 'balance', 'invested', 'dividends')


class SupportMessageInline(admin.TabularInline):
    model = SupportMessage
    extra = 0
    readonly_fields = ('created_at',)


@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = ('subject', 'user', 'category', 'status', 'created_at', 'updated_at')
    list_filter  = ('status', 'category')
    search_fields = ('subject', 'user__username')
    inlines = [SupportMessageInline]


@admin.register(FAQEntry)
class FAQEntryAdmin(admin.ModelAdmin):
    list_display = ('question', 'category', 'order', 'is_published')
    list_filter  = ('category', 'is_published')
    list_editable = ('order', 'is_published')


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'type', 'title', 'is_read', 'created_at')
    list_filter  = ('type', 'is_read')


@admin.register(DividendPayout)
class DividendPayoutAdmin(admin.ModelAdmin):
    list_display = ('investment', 'amount', 'paid_at', 'is_paid')
    list_filter  = ('is_paid',)
