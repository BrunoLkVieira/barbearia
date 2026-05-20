from django.urls import path
from . import views

app_name = 'scheduling'

urlpatterns = [
    path('<slug:barbershop_slug>/agenda/', views.SchedulingView, name='agenda'),
    
    # Rotas de API curtas e diretas
    path('api/get-employees/', views.get_employees_by_unit, name='get_employees'),
    path('api/get-services/', views.get_services_by_employee, name='get_services'),
]