from django.urls import path
from .views import (
    UnitView, EmployeeView, WorkDayView, check_employee_data, 
    MyWebsiteView, UnitLP, api_get_barbers, api_get_services, 
    process_booking_api, check_client_phone
)

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

    # ==========================================
    # APIs DE AGENDAMENTO (FRICTIONLESS BOOKING)
    # ==========================================
    path('<slug:barbershop_slug>/api/barbers/', api_get_barbers, name='api_get_barbers'),
    path('<slug:barbershop_slug>/api/services/', api_get_services, name='api_get_services'),
    path('<slug:barbershop_slug>/api/check-phone/', check_client_phone, name='api_check_phone'),
    path('<slug:barbershop_slug>/api/process-booking/', process_booking_api, name='api_process_booking'),
]