from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from django.utils.timezone import localdate
from datetime import datetime
from django.http import JsonResponse
from decimal import Decimal
from django.contrib.auth.decorators import login_required # NOVO: Importação para bloquear página

from apps.barbershop.models import Barbershop, Employee, Unit
from apps.service.models import BarberService
from apps.client.models import Client
from .models import Appointment, AppointmentService
from django.core.paginator import Paginator



# NOVO: Bloqueia o acesso para usuários anônimos
@login_required
def SchedulingView(request, barbershop_slug, unit_slug=None):
    barbershop = get_object_or_404(Barbershop, slug=barbershop_slug)
    
    # Lógica do Filtro de Unidade
    current_unit = None
    if unit_slug:
        current_unit = get_object_or_404(Unit, slug=unit_slug, barbershop=barbershop)
        employees = Employee.objects.filter(unit=current_unit)
    else:
        employees = Employee.objects.filter(unit__barbershop=barbershop)
        
    units = Unit.objects.filter(barbershop=barbershop)

    # 2. Processar ações do formulário (POST)
    if request.method == "POST":
        action = request.POST.get('action')
        
        try:
            # --- CRIAR AGENDAMENTO ---
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

            # --- EDITAR AGENDAMENTO ---
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

            # --- FINALIZAR SERVIÇO ---
            elif action == "complete_appointment":
                appointment_id = request.POST.get('appointment_id')
                appointment = get_object_or_404(Appointment, id=appointment_id, barbershop=barbershop)
                appointment.status = 'completed'
                appointment.is_paid = True
                appointment.save()
                messages.success(request, "Serviço finalizado e caixa atualizado!")

        except Exception as e:
            messages.error(request, f"Erro ao processar ação: {str(e)}")
        
        target_date = request.POST.get('date')
        if not target_date: target_date = request.GET.get('date')
        if target_date: return redirect(f"{request.path}?date={target_date}")
        return redirect(request.path)

    # 3. Filtros de Exibição (GET) - Data
    date_param = request.GET.get('date')
    if date_param:
        try: current_date = datetime.strptime(date_param, '%Y-%m-%d').date()
        except ValueError: current_date = localdate()
    else:
        current_date = localdate()

    # Filtro de Agendamentos por Unidade e Data
    appointments_query = Appointment.objects.filter(barbershop=barbershop, date=current_date)
    if current_unit:
        appointments_query = appointments_query.filter(unit=current_unit)
    appointments = appointments_query.order_by('time')

    # NOVO: Cálculo de duração dinâmica para a view
    for app in appointments:
        total_duration = 0
        for app_svc in app.services.all():
            # Busca o campo 'duration' do BarberService. Caso não exista, usa 45 min como segurança
            duration = getattr(app_svc.service, 'duration', 45) 
            total_duration += duration if duration else 45
        app.total_duration_calc = total_duration

    total_appointments = appointments.exclude(status='cancelled').count()
    total_revenue = sum(app.total_price for app in appointments if app.status != 'cancelled')
    completed_appointments = appointments.filter(status='completed').count()
    completed_revenue = sum(app.total_price for app in appointments if app.status == 'completed')

    clients_list = Client.objects.filter(barbershop=barbershop).order_by('first_name')
    catalog_services = BarberService.objects.filter(employee__unit__barbershop=barbershop).distinct()

    context = {
        'barbershop': barbershop,
        'employees': employees,
        'units': units,
        'current_unit': current_unit,
        'appointments': appointments,
        'clients_list': clients_list,       
        'catalog_services': catalog_services, 
        'current_date': current_date,
        'total_appointments': total_appointments,
        'total_revenue': total_revenue,
        'completed_appointments': completed_appointments,
        'completed_revenue': completed_revenue,
        'active_tab': 'agenda',
    }
    return render(request, 'scheduling/agenda.html', context)



@login_required
def AgendamentosHistoryView(request, barbershop_slug, unit_slug=None):
    barbershop = get_object_or_404(Barbershop, slug=barbershop_slug)
    
    # Lógica de Unidade
    current_unit = None
    if unit_slug:
        current_unit = get_object_or_404(Unit, slug=unit_slug, barbershop=barbershop)
        employees = Employee.objects.filter(unit=current_unit)
        appointments_query = Appointment.objects.filter(barbershop=barbershop, unit=current_unit)
    else:
        employees = Employee.objects.filter(unit__barbershop=barbershop)
        appointments_query = Appointment.objects.filter(barbershop=barbershop)

    units = Unit.objects.filter(barbershop=barbershop)
    services = BarberService.objects.filter(employee__unit__barbershop=barbershop).distinct()
    clients_list = Client.objects.filter(barbershop=barbershop).order_by('first_name')

    # PROCESSAMENTO DE POST (Editar e Excluir)
    if request.method == "POST":
        action = request.POST.get('action')
        try:
            if action == "edit_appointment":
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
                messages.success(request, "Agendamento atualizado com sucesso no Histórico!")

            elif action == "delete_appointment":
                appointment_id = request.POST.get('appointment_id')
                appointment = get_object_or_404(Appointment, id=appointment_id, barbershop=barbershop)
                appointment.delete()
                messages.success(request, "Agendamento excluído com sucesso!")

        except Exception as e:
            messages.error(request, f"Erro ao processar ação: {str(e)}")
        
        # Preserva os filtros na URL ao recarregar a página
        query_string = request.GET.urlencode()
        redirect_url = request.path
        if query_string:
            redirect_url += f"?{query_string}"
        return redirect(redirect_url)

    # ---------------------------------------------
    # LÓGICA DOS FILTROS (GET)
    # ---------------------------------------------
    date_filter = request.GET.get('date_filter', '')
    barber_filter = request.GET.get('barber_filter', '')
    service_filter = request.GET.get('service_filter', '')
    status_filter = request.GET.get('status_filter', '')

    if date_filter:
        appointments_query = appointments_query.filter(date=date_filter)
    if barber_filter:
        appointments_query = appointments_query.filter(employee_id=barber_filter)
    if service_filter:
        appointments_query = appointments_query.filter(services__service_id=service_filter)
    if status_filter:
        appointments_query = appointments_query.filter(status=status_filter)

    # Ordenação Decrescente
    appointments_query = appointments_query.order_by('-date', '-time').distinct()

    # Cálculos Estatísticos baseados no Filtro
    total_filtered_appointments = appointments_query.exclude(status='cancelled').count()
    total_filtered_revenue = sum(app.total_price for app in appointments_query if app.status == 'completed')

    # Paginação (10 itens por página)
    paginator = Paginator(appointments_query, 10)
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)

    context = {
        'barbershop': barbershop,
        'units': units,
        'current_unit': current_unit,
        'employees': employees,
        'services': services,
        'clients_list': clients_list,
        'page_obj': page_obj,
        'total_filtered_appointments': total_filtered_appointments,
        'total_filtered_revenue': total_filtered_revenue,
        'active_tab': 'history',
        'date_filter': date_filter,
        'barber_filter': barber_filter,
        'service_filter': service_filter,
        'status_filter': status_filter,
    }
    return render(request, 'scheduling/agendamentos.html', context)



# ==========================================
# ENDPOINTS DA API
# ==========================================
@login_required # NOVO: Bloqueio para a API também
def get_employees_by_unit(request):
    unit_id = request.GET.get('unit_id')
    if not unit_id:
        return JsonResponse({'employees': []})
    employees = Employee.objects.filter(unit_id=unit_id)
    data = [{'id': emp.id, 'name': f"{emp.user.name} {emp.user.last_name}"} for emp in employees]
    return JsonResponse({'employees': data})

@login_required # NOVO: Bloqueio para a API também
def get_services_by_employee(request):
    employee_id = request.GET.get('employee_id')
    if not employee_id:
        return JsonResponse({'services': []})
    services = BarberService.objects.filter(employee_id=employee_id)
    data = [{'id': svc.id, 'name': svc.name, 'price': float(svc.price) if svc.price else 0.0} for svc in services]
    return JsonResponse({'services': data})