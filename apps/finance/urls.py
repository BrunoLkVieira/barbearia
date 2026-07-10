# apps/finance/urls.py
from django.urls import path
from .views import FinanceDashboardView

app_name = "finance"

urlpatterns = [
    # Rota Geral (Para o Titular ver todas as unidades agrupadas)
    path('<slug:barbershop_slug>/dashboard/financas/', FinanceDashboardView, name='dashboard_general'),
    
    # Rota Específica da Unidade (Para Titular, Gerentes e Barbeiros)
    path('<slug:barbershop_slug>/<slug:unit_slug>/dashboard/financas/', FinanceDashboardView, name='dashboard_unit'),
]