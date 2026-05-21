from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from django.utils.timezone import localdate
from datetime import datetime
from django.http import JsonResponse
from decimal import Decimal

from apps.barbershop.models import Barbershop, Employee, Unit
from apps.service.models import BarberService
from apps.client.models import Client
from .models import Appointment, AppointmentService

# Adicionado 'unit_slug=None' nos parâmetros
def SchedulingView(request, barbershop_slug, unit_slug=None):
    barbershop = get_object_or_404(Barbershop, slug=barbershop_slug)
    
    # ---------------------------------------------
    # LÓGICA DO FILTRO DE UNIDADE
    # ---------------------------------------------
    current_unit = None
    if unit_slug:
        # Pega a unidade específica e filtra os barbeiros DELA
        current_unit = get_object_or_404(Unit, slug=unit_slug, barbershop=barbershop)
        employees = Employee.objects.filter(unit=current_unit)
    else:
        # Visão Geral: Mostra barbeiros de todas as unidades
        employees = Employee.objects.filter(unit__barbershop=barbershop)
        
    units = Unit.objects.filter(barbershop=barbershop)

    # 2. Processar ações do formulário (POST) ... [O BLOCO POST FICA EXATAMENTE IGUAL O SEU ANTERIOR]
    if request.method == "POST":
        action = request.POST.get('action')
        try:
            if action == "create_appointment":
                client_id = request.POST.get('client_id')
                employee_id = request.POST.get('employee_id')
                service_id = request.POST.get('service_id')
                date_str = request.POST.get('date')
                time_str = request.POST.get('time')
                notes_str = request.POST.get('notes', '')

                emp = get_object_or_404(Employee, id=employee_id)
                svc = get_object_or_404(BarberService, id=service_id)

                appointment = Appointment.objects.create(
                    client_id=client_id, employee=emp, barbershop=barbershop,
                    unit=emp.unit, date=date_str, time=time_str, status='scheduled',
                    total_price=svc.price, notes=notes_str
                )
                AppointmentService.objects.create(appointment=appointment, service=svc, price_at_sale=svc.price)
                messages.success(request, "Horário agendado com sucesso!")

            elif action == "edit_appointment":
                appointment_id = request.POST.get('appointment_id')
                client_id = request.POST.get('client_id')
                employee_id = request.POST.get('employee_id')
                service_id = request.POST.get('service_id')
                date_str = request.POST.get('date')
                time_str = request.POST.get('time')
                status_val = request.POST.get('status')
                notes_str = request.POST.get('notes', '')

                appointment = get_object_or_404(Appointment, id=appointment_id, barbershop=barbershop)
                emp = get_object_or_404(Employee, id=employee_id)
                svc = get_object_or_404(BarberService, id=service_id)

                appointment.client_id = client_id
                appointment.employee = emp
                appointment.unit = emp.unit
                appointment.date = date_str
                appointment.time = time_str
                appointment.total_price = svc.price
                appointment.status = status_val
                appointment.notes = notes_str
                
                if status_val == 'completed': appointment.is_paid = True
                elif status_val == 'cancelled' or status_val == 'scheduled': appointment.is_paid = False

                appointment.save()

                app_service = appointment.services.first()
                if app_service:
                    app_service.service = svc
                    app_service.price_at_sale = svc.price
                    app_service.save()
                else:
                    AppointmentService.objects.create(appointment=appointment, service=svc, price_at_sale=svc.price)
                messages.success(request, "Agendamento atualizado com sucesso!")

            elif action == "complete_appointment":
                appointment_id = request.POST.get('appointment_id')
                appointment = get_object_or_404(Appointment, id=appointment_id, barbershop=barbershop)
                appointment.status = 'completed'
                appointment.is_paid = True
                appointment.save()
                messages.success(request, "Serviço finalizado e caixa atualizado!")

        except Exception as e:
            messages.error(request, f"Erro ao processar ação: {str(e)}")
        
        # request.path preserva a URL atual (seja geral ou de unidade específica)
        return redirect(request.path)

    # 3. Filtros de Exibição (GET) - Data
    date_param = request.GET.get('date')
    if date_param:
        try: current_date = datetime.strptime(date_param, '%Y-%m-%d').date()
        except ValueError: current_date = localdate()
    else:
        current_date = localdate()

    # ---------------------------------------------
    # FILTRO DE AGENDAMENTOS POR UNIDADE E DATA
    # ---------------------------------------------
    appointments_query = Appointment.objects.filter(barbershop=barbershop, date=current_date)
    
    if current_unit:
        appointments_query = appointments_query.filter(unit=current_unit)
        
    appointments = appointments_query.order_by('time')

    total_appointments = appointments.count()
    total_revenue = sum(app.total_price for app in appointments if app.status != 'cancelled')

    clients_list = Client.objects.filter(barbershop=barbershop).order_by('first_name')
    catalog_services = BarberService.objects.filter(employee__unit__barbershop=barbershop).distinct()

    context = {
        'barbershop': barbershop,
        'employees': employees,
        'units': units,
        'current_unit': current_unit, # Enviamos a unidade atual para o HTML para deixar selecionada
        'appointments': appointments,
        'clients_list': clients_list,       
        'catalog_services': catalog_services, 
        'current_date': current_date,
        'total_appointments': total_appointments,
        'total_revenue': total_revenue,
        'active_tab': 'agenda',
    }
    return render(request, 'scheduling/agenda.html', context)

# ==========================================
# ENDPOINTS DA API
# ==========================================
def get_employees_by_unit(request):
    unit_id = request.GET.get('unit_id')
    if not unit_id:
        return JsonResponse({'employees': []})
    employees = Employee.objects.filter(unit_id=unit_id)
    data = [{'id': emp.id, 'name': f"{emp.user.name} {emp.user.last_name}"} for emp in employees]
    return JsonResponse({'employees': data})

def get_services_by_employee(request):
    employee_id = request.GET.get('employee_id')
    if not employee_id:
        return JsonResponse({'services': []})
    services = BarberService.objects.filter(employee_id=employee_id)
    data = [{'id': svc.id, 'name': svc.name, 'price': float(svc.price) if svc.price else 0.0} for svc in services]
    return JsonResponse({'services': data})