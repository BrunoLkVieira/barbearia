from django.urls import path
from .views import UnitView, EmployeeView, WorkDayView

app_name = "barbershop"

urlpatterns = [
    # Unidades (só dono)
    path('<slug:barbershop_slug>/unidades/', UnitView, name='units'),

    # Funcionários
    path('<slug:barbershop_slug>/funcionarios/', EmployeeView, name='employee_general'),  # dono, visão geral
    path('<slug:barbershop_slug>/<slug:unit_slug>/funcionarios/', EmployeeView, name='employee_unit'),

    # Funcionamento
    path('<slug:barbershop_slug>/funcionamento/', WorkDayView, name='workday_general'),
    path('<slug:barbershop_slug>/<slug:unit_slug>/funcionamento/', WorkDayView, name='workday_unit'),
]
