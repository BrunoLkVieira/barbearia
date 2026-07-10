from django.contrib import admin
from .models import Appointment, AppointmentService

class AppointmentServiceInline(admin.TabularInline):
    model = AppointmentService
    extra = 1 # Quantos campos vazios aparecem para adicionar novos serviços

@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    # Listagem principal da agenda
    list_display = ('date', 'time', 'client', 'employee', 'status', 'is_paid', 'total_price', 'unit')
    
    # Filtros para achar agendamentos específicos
    list_filter = ('status', 'is_paid', 'date', 'barbershop', 'unit')
    
    # Busca por nome do cliente ou do barbeiro (repare no __ para buscar em tabelas relacionadas)
    search_fields = ('client__first_name', 'employee__user__name', 'notes')
    
    # Hierarquia de data no topo (facilita navegar por meses/anos)
    date_hierarchy = 'date'
    
    # Coloca os serviços dentro da tela do agendamento
    inlines = [AppointmentServiceInline]
    
    # Ordenação padrão (mais recentes primeiro)
    ordering = ('-date', '-time')


@admin.register(AppointmentService)
class AppointmentServiceAdmin(admin.ModelAdmin):
    # Um controle avulso (opcional) para ver todos os serviços de forma listada, focado nas comissões
    list_display = ('id', 'appointment', 'service', 'price_at_sale', 'barber_commission_value')
    list_filter = ('appointment__date', 'appointment__employee')
    search_fields = ('appointment__client__name', 'service__name')