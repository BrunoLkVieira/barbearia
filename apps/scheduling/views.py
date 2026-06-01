import json
import re
from datetime import datetime, date
from decimal import Decimal
from django.utils.timezone import localdate
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.core.paginator import Paginator
from django.db.models import Sum, F
from django.utils.timezone import now
from django.db.models import Prefetch

from apps.barbershop.models import Barbershop, Unit, Employee, Role
from apps.client.models import Client
from apps.service.models import BarberService, BaseService  # <-- Adicionado BaseService
from apps.scheduling.models import Appointment, AppointmentService



def get_tenant_employee(user, barbershop):
    if user.is_authenticated:
        return Employee.objects.filter(user=user, unit__barbershop=barbershop, is_active=True).first()
    return None

def owner_or_employee_required(view_func):
    def wrapper(request, barbershop_slug, *args, **kwargs):
        if not request.user.is_authenticated:
            messages.error(request, "Faça login para acessar.")
            return redirect("user:login")
            
        barbershop = get_object_or_404(Barbershop, slug=barbershop_slug)
        if request.user == barbershop.owner_user:
            return view_func(request, barbershop_slug, *args, **kwargs)
            
        emp = get_tenant_employee(request.user, barbershop)
        if not emp or not emp.system_access:
            messages.error(request, "Você não tem acesso a este painel.")
            return redirect("/") # <-- Corrigido o erro 500 do core:home
            
        return view_func(request, barbershop_slug, *args, **kwargs)
    return wrapper

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
@owner_or_employee_required
def AgendamentosHistoryView(request, barbershop_slug, unit_slug=None):
    barbershop = get_object_or_404(Barbershop, slug=barbershop_slug)
    
    is_owner = (request.user == barbershop.owner_user)
    emp = get_tenant_employee(request.user, barbershop)
    
    is_manager = False
    is_cashier = False
    is_barber = False
    gerente_unit = None
    
    if emp:
        is_manager = emp.roles.filter(occupation=Role.Occupation.GERENTE).exists()
        is_cashier = emp.roles.filter(occupation=Role.Occupation.CAIXA).exists() and not is_manager
        is_barber = emp.roles.filter(occupation=Role.Occupation.BARBEIRO).exists()
        if is_manager or is_cashier:
            gerente_unit = emp.unit

    current_unit = None
    units = barbershop.units.filter(is_active=True)

    if is_owner:
        if unit_slug:
            current_unit = get_object_or_404(Unit, slug=unit_slug, barbershop=barbershop)
            appointments = Appointment.objects.filter(unit=current_unit)
        else:
            appointments = Appointment.objects.filter(barbershop=barbershop)
    
    elif is_manager or is_cashier:
        current_unit = gerente_unit
        units = [current_unit] 
        appointments = Appointment.objects.filter(unit=current_unit)
    
    else: 
        current_unit = emp.unit
        units = [current_unit]
        appointments = Appointment.objects.filter(employee=emp)

    if request.method == "POST":
        action = request.POST.get("action")
        
        if is_cashier and not is_owner:
            messages.error(request, "Acesso Negado: Caixas não têm permissão para editar o histórico.")
            return redirect(request.path)

        if action == "edit_appointment":
            app_id = request.POST.get("appointment_id")
            appointment = get_object_or_404(Appointment, id=app_id, barbershop=barbershop)
            
            if not is_owner:
                if is_manager and appointment.unit != current_unit:
                    messages.error(request, "Acesso Negado: Este agendamento pertence a outra filial.")
                    return redirect(request.path)
                elif not is_manager and appointment.employee != emp:
                    messages.error(request, "Acesso Negado: Você só pode editar seus próprios agendamentos.")
                    return redirect(request.path)

            appointment.client_id = request.POST.get("client_id")
            appointment.unit_id = request.POST.get("unit_id") if is_owner else current_unit.id
            appointment.employee_id = request.POST.get("employee_id") if (is_owner or is_manager) else emp.id
            appointment.date = request.POST.get("date")
            appointment.time = request.POST.get("time")
            appointment.status = request.POST.get("status")
            appointment.notes = request.POST.get("notes")
            
            new_service_id = request.POST.get("service_id")
            if new_service_id:
                new_service = get_object_or_404(BarberService, id=new_service_id)
                appointment.services.all().delete()
                AppointmentService.objects.create(appointment=appointment, service=new_service, price_at_sale=new_service.price)
                appointment.total_price = new_service.price
            
            appointment.save()
            messages.success(request, "Agendamento atualizado com sucesso!")
            return redirect(request.path)

        elif action == "delete_appointment":
            if not is_owner and not is_manager:
                messages.error(request, "Acesso Negado: Apenas o gerente ou o Titular podem deletar definitivamente um registro.")
                return redirect(request.path)
            
            app_id = request.POST.get("appointment_id")
            appointment = get_object_or_404(Appointment, id=app_id, barbershop=barbershop)
            
            if is_manager and not is_owner and appointment.unit != current_unit:
                messages.error(request, "Acesso Negado: Este agendamento pertence a outra filial.")
                return redirect(request.path)
                
            appointment.delete()
            messages.success(request, "Agendamento excluído definitivamente.")
            return redirect(request.path)

    date_filter = request.GET.get('date_filter', '')
    month_filter = request.GET.get('month_filter', '')
    barber_filter = request.GET.get('barber_filter', '')
    service_filter = request.GET.get('service_filter', '')
    status_filter = request.GET.get('status_filter', '')

    appointments = appointments.select_related('client', 'employee__user', 'unit').prefetch_related('services__service')
    
    if date_filter:
        appointments = appointments.filter(date=date_filter)
    if month_filter:
        try:
            year, month = month_filter.split('-')
            appointments = appointments.filter(date__year=year, date__month=month)
        except ValueError: pass
    
    if barber_filter:
        appointments = appointments.filter(employee_id=barber_filter)
    if service_filter:
        # Filtra através do BaseService acoplado ao BarberService para agrupar
        appointments = appointments.filter(services__service__base_service_id=service_filter)
    if status_filter:
        appointments = appointments.filter(status=status_filter)

    # Ordenação da mais antiga para a nova e Distinct para evitar duplicidade no count()
    appointments = appointments.distinct().order_by('date', 'time')

    total_filtered_appointments = appointments.count()
    total_filtered_revenue = appointments.filter(status='completed').aggregate(total=Sum('total_price'))['total'] or 0.00

    paginator = Paginator(appointments, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    clients_list = Client.objects.filter(barbershop=barbershop).order_by('first_name')
    
    # Select de BaseServices (Para o filtro agrupar)
    if is_owner:
        barbers_list = Employee.objects.filter(unit__barbershop=barbershop, roles__occupation='barbeiro', is_active=True).distinct()
        filter_services = BaseService.objects.filter(barberservice__employee__unit__barbershop=barbershop).distinct()
    elif is_manager or is_cashier:
        barbers_list = Employee.objects.filter(unit=current_unit, roles__occupation='barbeiro', is_active=True).distinct()
        filter_services = BaseService.objects.filter(barberservice__employee__unit=current_unit).distinct()
    else:
        barbers_list = [emp]
        filter_services = BaseService.objects.filter(barberservice__employee=emp).distinct()

    # BarberServices apenas para o Modal do barbeiro comum
    barber_services_list = BarberService.objects.filter(employee=emp) if is_barber and not is_owner and not is_manager else []

    context = {
        'barbershop': barbershop,
        'units': units,
        'current_unit': current_unit,
        'page_obj': page_obj,
        'date_filter': date_filter,
        'month_filter': month_filter,
        'barber_filter': barber_filter,
        'service_filter': service_filter,
        'status_filter': status_filter,
        'total_filtered_appointments': total_filtered_appointments,
        'total_filtered_revenue': total_filtered_revenue,
        'employees': barbers_list,
        'filter_services': filter_services,
        'barber_services': barber_services_list,
        'clients_list': clients_list,
        'is_owner': is_owner,
        'is_manager': is_manager,
        'is_cashier': is_cashier,
        'is_barber': is_barber,
    }

    return render(request, "scheduling/agendamentos.html", context)


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