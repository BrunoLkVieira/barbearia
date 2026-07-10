from django.contrib import admin
from .models import UnitExpense

@admin.register(UnitExpense)
class UnitExpenseAdmin(admin.ModelAdmin):
    # O que aparece na tabela principal
    list_display = ('name', 'unit', 'amount', 'due_date', 'is_recurring', 'is_paid', 'created_at')
    
    # Filtros laterais para facilitar a auditoria
    list_filter = ('is_paid', 'is_recurring', 'due_date', 'unit')
    
    # Barra de pesquisa
    search_fields = ('name', 'unit__name')
    
    # Ordena sempre pela data de vencimento mais recente primeiro
    ordering = ('-due_date',)
    
    # Agrupa os campos ao abrir o detalhe de uma despesa
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('unit', 'name', 'amount', 'due_date')
        }),
        ('Status e Recorrência', {
            'fields': ('is_recurring', 'is_paid')
        }),
    )