from django.urls import path
from . import views

app_name = 'scheduling'

urlpatterns = [
    # Rotas da Agenda
    path('<slug:barbershop_slug>/agenda/', views.SchedulingView, name='agenda'),
    path('<slug:barbershop_slug>/<slug:unit_slug>/agenda/', views.SchedulingView, name='agenda_unit'),
    
    # Rotas do Histórico de Agendamentos
    path('<slug:barbershop_slug>/historico/agendamentos/', views.AgendamentosHistoryView, name='history_general'),
    path('<slug:barbershop_slug>/<slug:unit_slug>/historico/agendamentos/', views.AgendamentosHistoryView, name='history_unit'),
    
    # Rotas da API (Dependentes e Reativas)
    path('api/get-employees/', views.get_employees_by_unit, name='get_employees'),
    path('api/get-services/', views.get_services_by_employee, name='get_services'),
    path('api/get-available-slots/', views.get_available_slots, name='get_slots'),
]