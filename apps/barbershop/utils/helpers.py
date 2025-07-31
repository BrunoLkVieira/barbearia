# apps/barbershop/utils/helpers.py

from django.utils import timezone
from datetime import datetime, timedelta
from ..models import Employee, EmployeeAbsence, EmployeeWorkDay

def get_available_barbers(barbershop, date=None, time=None):
    """
    Retorna barbeiros disponíveis para determinado dia/horário
    """
    if not date:
        date = timezone.now().date()
    
    # Barbeiros ativos da barbearia
    barbers = Employee.objects.filter(
        unit__barbershop=barbershop,
        role='barbeiro',
        is_active=True
    )
    
    available_barbers = []
    
    for barber in barbers:
        # Verificar se trabalha no dia da semana
        day_of_week = date.weekday()  # 0=segunda, 6=domingo
        
        try:
            work_day = barber.work_days.get(day_of_week=day_of_week)
            if not work_day.is_working:
                continue  # Não trabalha neste dia
        except EmployeeWorkDay.DoesNotExist:
            continue  # Não tem horário definido
        
        # Verificar ausências
        has_absence = EmployeeAbsence.objects.filter(
            employee=barber,
            date__lte=date,
            end_date__gte=date if date else timezone.now().date()
        ).exists()
        
        if has_absence:
            continue  # Está ausente
        
        # Se passou por todas as verificações, está disponível
        available_barbers.append({
            'barber': barber,
            'work_start': work_day.start_time,
            'work_end': work_day.end_time,
        })
    
    return available_barbers

def get_barbershop_schedule(barbershop, date=None):
    """
    Retorna agenda completa da barbearia para um dia
    """
    if not date:
        date = timezone.now().date()
    
    available_barbers = get_available_barbers(barbershop, date)
    
    schedule = {
        'date': date,
        'barbers': available_barbers,
        'total_available': len(available_barbers)
    }
    
    return schedule

def get_next_available_dates(barbershop, days_ahead=7):
    """
    Retorna próximos dias disponíveis da barbearia
    """
    available_dates = []
    current_date = timezone.now().date()
    
    for i in range(days_ahead):
        check_date = current_date + timedelta(days=i)
        available_barbers = get_available_barbers(barbershop, check_date)
        
        if available_barbers:
            available_dates.append({
                'date': check_date,
                'barbers_count': len(available_barbers)
            })
    
    return available_dates

def format_working_hours(work_days):
    """
    Formata horários de funcionamento para exibição
    Ex: "Segunda à Sexta: 8h às 18h"
    """
    if not work_days:
        return "Horários não definidos"
    
    days_map = {
        0: 'Segunda',
        1: 'Terça',
        2: 'Quarta',
        3: 'Quinta',
        4: 'Sexta',
        5: 'Sábado',
        6: 'Domingo'
    }
    
    formatted_hours = []
    
    for day in work_days:
        if day.is_closed:
            continue
            
        day_name = days_map[day.day_of_week]
        hours = f"{day.start_time.strftime('%H:%M')} às {day.end_time.strftime('%H:%M')}"
        formatted_hours.append(f"{day_name}: {hours}")
    
    return formatted_hours