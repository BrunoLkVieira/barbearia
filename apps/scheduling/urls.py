from django.urls import path
from . import views

app_name = 'scheduling'

urlpatterns = [
    # Rota Geral
    path('<slug:barbershop_slug>/agenda/', views.SchedulingView, name='agenda'),
    # Rota Específica da Unidade
    path('<slug:barbershop_slug>/<slug:unit_slug>/agenda/', views.SchedulingView, name='agenda_unit'),
    
    # Rotas da API
    path('api/get-employees/', views.get_employees_by_unit, name='get_employees'),
    path('api/get-services/', views.get_services_by_employee, name='get_services'),
]