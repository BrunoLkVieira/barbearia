from django.urls import path
from .views import UnitView, EmployeeView, WorkDayView, check_employee_data, MyWebsiteView, UnitLP

app_name = "barbershop"

urlpatterns = [
    # Unidades (só dono)
    path('<slug:barbershop_slug>/unidades/', UnitView, name='units'),

    # Funcionários
    path('<slug:barbershop_slug>/funcionarios/', EmployeeView, name='employee_general'),  # dono, visão geral
    path('<slug:barbershop_slug>/<slug:unit_slug>/funcionarios/', EmployeeView, name='employee_unit'),


    path('check-employee-data/', check_employee_data, name='check_employee_data'),
   
    # Funcionamento
    path('<slug:barbershop_slug>/funcionamento/', WorkDayView, name='workday_general'),
    path('<slug:barbershop_slug>/<slug:unit_slug>/funcionamento/', WorkDayView, name='workday_unit'),

    
    # Website   
    path('<slug:barbershop_slug>/website/', MyWebsiteView, name='myWebsite'),
    path('<slug:barbershop_slug>/<slug:unit_slug>/website/', MyWebsiteView, name='myWebsite_unit'),

    # LP Geral (Pega a primeira unidade ativa por padrão)
    path('<slug:barbershop_slug>/agendar/', UnitLP, name='unitLP'),
    # LP de uma Unidade específica
    path('<slug:barbershop_slug>/agendar/<slug:unit_slug>/', UnitLP, name='unitLP_unit'),
]
