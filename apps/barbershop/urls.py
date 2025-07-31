# apps/barbershop/urls.py

from django.urls import path
from .views import (
    BarbershopLandingView,
    BarbershopAdminDashboardView,
    BarbershopSettingsView,
    UnitManagementView,
    UnitCreateView,
    EmployeeManagementView,
    EmployeeCreateView,
    EmployeeAvailabilityView,
    AbsenceCreateView,
    toggle_employee_status,
    barbershop_public_site,
)

app_name = 'barbershop'

urlpatterns = [
    # Landing page da barbearia (login de clientes)
    path('<slug:slug>/', BarbershopLandingView.as_view(), name='landing'),
    
    # Site público da barbearia
    path('<slug:slug>/web/', barbershop_public_site, name='public_site'),
    
    # ÁREA ADMINISTRATIVA DA BARBEARIA
    
    # Dashboard principal (após login do funcionário)
    path('<slug:slug>/admin/', BarbershopAdminDashboardView.as_view(), name='dashboard'),
    
    # Configurações da barbearia (Minha Barbearia)
    path('<slug:slug>/admin/settings/', BarbershopSettingsView.as_view(), name='settings'),
    
    # Gerenciamento de unidades/filiais
    path('<slug:slug>/admin/units/', UnitManagementView.as_view(), name='units'),
    path('<slug:slug>/admin/units/create/', UnitCreateView.as_view(), name='unit_create'),
    
    # Gerenciamento de funcionários
    path('<slug:slug>/admin/employees/', EmployeeManagementView.as_view(), name='employees'),
    path('<slug:slug>/admin/employees/create/', EmployeeCreateView.as_view(), name='employee_create'),
    
    # Disponibilidade de barbeiros (página das imagens 2 e 3)
    path('<slug:slug>/admin/availability/', EmployeeAvailabilityView.as_view(), name='availability'),
    
    # Registrar ausências
    path('<slug:slug>/admin/absences/create/', AbsenceCreateView.as_view(), name='absence_create'),
    
    # AJAX endpoints
    path('<slug:slug>/admin/employees/<int:employee_id>/toggle/', 
         toggle_employee_status, 
         name='toggle_employee_status'),
]