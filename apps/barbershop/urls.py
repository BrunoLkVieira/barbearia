# apps/barbershop/urls.py - ATUALIZADO

from django.urls import path
from .views import (
    BarbershopLandingView,
    BarbershopEmployeeLoginView,
    BarbershopAdminDashboardView,
    BarbershopSettingsView,
    BarbershopWebsiteEditView,
    UnitManagementView,
    UnitCreateView,
    EmployeeManagementView,
    EmployeeCreateView,
    EmployeeAvailabilityView,
    AbsenceCreateView,
    set_current_unit,
    toggle_employee_status,
    barbershop_public_site,
)

app_name = 'barbershop'

urlpatterns = [
    # Landing page da barbearia (login de clientes)
    path('<slug:slug>/', BarbershopLandingView.as_view(), name='landing'),
    
    # Site público da barbearia
    path('<slug:slug>/web/', barbershop_public_site, name='public_site'),
    
    # Login específico para funcionários/barbeiros
    path('<slug:slug>/login/', BarbershopEmployeeLoginView.as_view(), name='login'),
    
    # ÁREA ADMINISTRATIVA DA BARBEARIA
    
    # Dashboard principal (após login do funcionário)
    path('<slug:slug>/admin/', BarbershopAdminDashboardView.as_view(), name='dashboard'),
    
    # Configurações da barbearia (Minha Barbearia)
    path('<slug:slug>/admin/settings/', BarbershopSettingsView.as_view(), name='settings'),
    
    # Edição do website público (Meu Website)
    path('<slug:slug>/admin/website/', BarbershopWebsiteEditView.as_view(), name='website'),
    
    # Gerenciamento de unidades/filiais
    path('<slug:slug>/admin/units/', UnitManagementView.as_view(), name='units'),
    path('<slug:slug>/admin/units/create/', UnitCreateView.as_view(), name='unit_create'),
    
    # Gerenciamento de funcionários
    path('<slug:slug>/admin/employees/', EmployeeManagementView.as_view(), name='employees'),
    path('<slug:slug>/admin/employees/create/', EmployeeCreateView.as_view(), name='employee_create'),
    
    # Disponibilidade de barbeiros (Funcionamento)
    path('<slug:slug>/admin/availability/', EmployeeAvailabilityView.as_view(), name='availability'),
    
    # Registrar ausências
    path('<slug:slug>/admin/absences/create/', AbsenceCreateView.as_view(), name='absence_create'),
    
    # AJAX endpoints
    path('<slug:slug>/admin/set-unit/', set_current_unit, name='set_current_unit'),
    path('<slug:slug>/admin/employees/<int:employee_id>/toggle/', 
         toggle_employee_status, 
         name='toggle_employee_status'),
]