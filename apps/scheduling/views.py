import json
import re
from datetime import datetime, date, timedelta
from decimal import Decimal
from django.utils.timezone import localdate, localtime, now
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.core.paginator import Paginator
from django.db.models import Sum, F
from django.db.models import Prefetch

from apps.barbershop.models import Barbershop, Unit, Employee, Role, EmployeeWorkDay, EmployeeAbsence, UnitHoliday
from apps.client.models import Client
from apps.service.models import BarberService, BaseService 
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
            return redirect("/") 
            
        return view_func(request, barbershop_slug, *args, **kwargs)
    return wrapper

@login_required
@owner_or_employee_required
def SchedulingView(request, barbershop_slug, unit_slug=None):
    barbershop = get_object_or_404(Barbershop, slug=barbershop_slug)
    today = localdate()
    
    is_owner = (request.user == barbershop.owner_user)
    emp = get_tenant_employee(request.user, barbershop)
    
    is_manager = False
    is_cashier = False
    is_barber = False
    current_unit = None
    
    if emp:
        is_manager = emp.roles.filter(occupation__iexact='gerente').exists()
        is_cashier = emp.roles.filter(occupation__iexact='caixa').exists() and not is_manager
        is_barber = emp.roles.filter(occupation__iexact='barbeiro').exists()

    if is_owner:
        if unit_slug:
            current_unit = get_object_or_404(Unit, slug=unit_slug, barbershop=barbershop)
            barbers_qs = Employee.objects.filter(unit=current_unit, roles__occupation__iexact='barbeiro', is_active=True).distinct()
        else:
            barbers_qs = Employee.objects.filter(unit__barbershop=barbershop, roles__occupation__iexact='barbeiro', is_active=True).distinct()
        units = Unit.objects.filter(barbershop=barbershop, is_active=True)
    else:
        current_unit = emp.unit
        units = [current_unit]
        if is_manager or is_cashier:
            barbers_qs = Employee.objects.filter(unit=current_unit, roles__occupation__iexact='barbeiro', is_active=True).distinct()
        else:
            barbers_qs = Employee.objects.filter(id=emp.id)

    employees = sorted(barbers_qs, key=lambda e: 0 if e.user == barbershop.owner_user else 1)

    date_param = request.GET.get('date') or request.POST.get('date')
    if date_param:
        try:
            current_date = datetime.strptime(date_param, '%Y-%m-%d').date()
            if current_date < today: current_date = today
        except ValueError: current_date = today
    else:
        current_date = today

    if request.method == "POST":
        action = request.POST.get('action')
        
        if is_cashier and action in ["create_appointment", "edit_appointment", "delete_appointment"]:
            messages.error(request, "Acesso Negado: Seu cargo permite apenas visualizar e finalizar pagamentos.")
            return redirect(f"{request.path}?date={current_date}")

        try:
            if action in ["create_appointment", "edit_appointment"]:
                appointment_id = request.POST.get('appointment_id')
                client_id = request.POST.get('client_id')
                employee_id = request.POST.get('employee_id')
                unit_id = request.POST.get('unit_id') if is_owner else current_unit.id
                service_ids = request.POST.getlist('service_id')
                date_str = request.POST.get('date')
                time_str = request.POST.get('time')
                status_val = request.POST.get('status', 'scheduled')
                notes_str = request.POST.get('notes', '')

                if not service_ids or not time_str:
                    messages.error(request, "Atenção: Serviço e horário são campos obrigatórios.")
                    return redirect(f"{request.path}?date={current_date}")

                if action == "create_appointment":
                    target_date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
                    target_time_obj = datetime.strptime(time_str, '%H:%M').time()
                    if target_date_obj < today or (target_date_obj == today and target_time_obj <= localtime(now()).time()):
                        messages.error(request, "Erro: Não é possível realizar um agendamento em um horário que já passou.")
                        return redirect(f"{request.path}?date={current_date}")

                # CORREÇÃO: Agendamentos Finalizados OCUPAM espaço na agenda. Só ignora cancelados!
                barber_conflict = Appointment.objects.filter(employee_id=employee_id, date=date_str, time=time_str).exclude(status__in=['cancelled', 'Cancelado'])
                client_conflict = Appointment.objects.filter(client_id=client_id, date=date_str, time=time_str).exclude(status__in=['cancelled', 'Cancelado'])
                
                if action == "edit_appointment":
                    barber_conflict = barber_conflict.exclude(id=appointment_id)
                    client_conflict = client_conflict.exclude(id=appointment_id)
                
                if barber_conflict.exists() and status_val not in ['cancelled', 'Cancelado']:
                    messages.error(request, "Conflito: Este barbeiro já possui um agendamento ativo neste horário.")
                    return redirect(f"{request.path}?date={current_date}")
                if client_conflict.exists() and status_val not in ['cancelled', 'Cancelado']:
                    messages.error(request, "Conflito: Este cliente já possui um agendamento marcado neste horário.")
                    return redirect(f"{request.path}?date={current_date}")

                target_emp = get_object_or_404(Employee, id=employee_id, unit__barbershop=barbershop)
                target_client = get_object_or_404(Client, id=client_id, barbershop=barbershop)
                target_unit = get_object_or_404(Unit, id=unit_id, barbershop=barbershop)

                if action == "create_appointment":
                    appointment = Appointment.objects.create(
                        client=target_client, employee=target_emp, barbershop=barbershop,
                        unit=target_unit, date=date_str, time=time_str, status='scheduled',
                        total_price=0, notes=notes_str
                    )
                    msg = "Horário agendado com sucesso!"
                else:
                    appointment = get_object_or_404(Appointment, id=appointment_id, barbershop=barbershop)
                    appointment.client = target_client
                    appointment.employee = target_emp
                    appointment.unit = target_unit
                    appointment.date = date_str
                    appointment.time = time_str
                    appointment.status = status_val
                    appointment.notes = notes_str
                    
                    if status_val == 'completed': appointment.is_paid = True
                    elif status_val in ['cancelled', 'scheduled']: appointment.is_paid = False

                    appointment.services.all().delete()
                    msg = "Agendamento atualizado com sucesso!"

                total_price = Decimal('0.00')
                for sid in service_ids:
                    svc = get_object_or_404(BarberService, id=sid)
                    AppointmentService.objects.create(appointment=appointment, service=svc, price_at_sale=svc.price)
                    total_price += svc.price
                    
                appointment.total_price = total_price
                appointment.save()
                messages.success(request, msg)
                
            elif action == "delete_appointment":
                if not is_owner and not is_manager:
                    messages.error(request, "Acesso Negado: Apenas gerente ou titular podem excluir registros.")
                    return redirect(f"{request.path}?date={current_date}")
                    
                app_id = request.POST.get("appointment_id")
                appointment = get_object_or_404(Appointment, id=app_id, barbershop=barbershop)
                appointment.delete()
                messages.success(request, "Agendamento excluído definitivamente.")

            elif action == "complete_appointment":
                appointment_id = request.POST.get('appointment_id')
                appointment = get_object_or_404(Appointment, id=appointment_id, barbershop=barbershop)
                
                extra_service_ids = request.POST.getlist('extra_service_id')
                if extra_service_ids:
                    for extra_id in extra_service_ids:
                        extra_svc = get_object_or_404(BarberService, id=extra_id)
                        AppointmentService.objects.create(appointment=appointment, service=extra_svc, price_at_sale=extra_svc.price)
                        appointment.total_price += extra_svc.price
                
                appointment.status = 'completed'
                appointment.is_paid = True
                payment_type = request.POST.get('payment_type')
                if payment_type:
                    appointment.payment_type = payment_type
                appointment.save()
                messages.success(request, "Serviço finalizado e caixa atualizado!")

        except Exception as e:
            messages.error(request, f"Erro ao processar ação: {str(e)}")
        
        return redirect(f"{request.path}?date={current_date}")

    appointments_query = Appointment.objects.filter(barbershop=barbershop, date=current_date)
    if current_unit:
        appointments_query = appointments_query.filter(unit=current_unit)
    
    if not is_owner and not is_manager and not is_cashier:
        appointments_query = appointments_query.filter(employee=emp)

    appointments = appointments_query.order_by('time').prefetch_related('services__service')

    for app in appointments:
        app.total_duration_calc = sum([(getattr(s.service, 'duration', 30) or 30) for s in app.services.all()])

    total_appointments = appointments.exclude(status__in=['cancelled', 'Cancelado']).count()
    total_revenue = sum(app.total_price for app in appointments if app.status not in ['cancelled', 'Cancelado'])
    completed_appointments = appointments.filter(status='completed').count()
    completed_revenue = sum(app.total_price for app in appointments if app.status == 'completed')

    clients_list = Client.objects.filter(barbershop=barbershop).order_by('first_name')

    context = {
        'barbershop': barbershop, 'employees': employees, 'units': units, 'current_unit': current_unit,
        'appointments': appointments, 'clients_list': clients_list, 'current_date': current_date, 'today': today,
        'total_appointments': total_appointments, 'total_revenue': total_revenue,
        'completed_appointments': completed_appointments, 'completed_revenue': completed_revenue,
        'active_tab': 'agenda', 'is_owner': is_owner, 'is_manager': is_manager, 'is_cashier': is_cashier, 'is_barber': is_barber
    }
    return render(request, 'scheduling/agenda.html', context)


@login_required
@owner_or_employee_required
def AgendamentosHistoryView(request, barbershop_slug, unit_slug=None):
    barbershop = get_object_or_404(Barbershop, slug=barbershop_slug)
    today = localdate()
    
    is_owner = (request.user == barbershop.owner_user)
    emp = get_tenant_employee(request.user, barbershop)
    
    is_manager = False
    is_cashier = False
    is_barber = False
    gerente_unit = None
    
    if emp:
        is_manager = emp.roles.filter(occupation__iexact='gerente').exists()
        is_cashier = emp.roles.filter(occupation__iexact='caixa').exists() and not is_manager
        is_barber = emp.roles.filter(occupation__iexact='barbeiro').exists()
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

        # Cobre Lançamento Retroativo (create) e Edição Retroativa (edit)
        if action in ["create_appointment", "edit_appointment"]:
            app_id = request.POST.get("appointment_id")
            client_id = request.POST.get("client_id")
            unit_id = request.POST.get("unit_id") if is_owner else current_unit.id
            employee_id = request.POST.get("employee_id") if (is_owner or is_manager) else emp.id
            date_str = request.POST.get("date")
            time_str = request.POST.get("time")
            status_val = request.POST.get("status", "completed")
            notes_str = request.POST.get("notes", "")
            service_ids = request.POST.getlist('service_id')

            if not service_ids or not time_str:
                messages.error(request, "Atenção: Serviço e horário são campos obrigatórios.")
                return redirect(f"{request.path}?{request.GET.urlencode()}")

            # ---------------------------------------------------------------------
            # REGRA DE OURO: Bloqueio de Agendamento Pendente no Passado
            # ---------------------------------------------------------------------
            target_date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
            target_time_obj = datetime.strptime(time_str, '%H:%M').time()
            is_past = target_date_obj < today or (target_date_obj == today and target_time_obj <= localtime(now()).time())
            
            if is_past and status_val == 'scheduled':
                messages.error(request, "Erro de Negócio: Lançamentos retroativos não podem ficar com o status 'Pendente'. Salve como Finalizado ou Cancelado.")
                return redirect(f"{request.path}?{request.GET.urlencode()}")
            # ---------------------------------------------------------------------

            # TRAVA DE COLISÃO
            barber_conflict = Appointment.objects.filter(employee_id=employee_id, date=date_str, time=time_str).exclude(status__in=['cancelled', 'Cancelado'])
            client_conflict = Appointment.objects.filter(client_id=client_id, date=date_str, time=time_str).exclude(status__in=['cancelled', 'Cancelado'])

            if action == "edit_appointment":
                barber_conflict = barber_conflict.exclude(id=app_id)
                client_conflict = client_conflict.exclude(id=app_id)

            if barber_conflict.exists() and status_val not in ['cancelled', 'Cancelado']:
                messages.error(request, "Conflito: Este barbeiro possui outro agendamento válido neste horário.")
                return redirect(f"{request.path}?{request.GET.urlencode()}")
            
            if client_conflict.exists() and status_val not in ['cancelled', 'Cancelado']:
                messages.error(request, "Conflito: Este cliente possui outro agendamento válido neste horário.")
                return redirect(f"{request.path}?{request.GET.urlencode()}")

            target_emp = get_object_or_404(Employee, id=employee_id, unit__barbershop=barbershop)
            target_unit = get_object_or_404(Unit, id=unit_id, barbershop=barbershop)
            target_client = get_object_or_404(Client, id=client_id, barbershop=barbershop)

            if action == "create_appointment":
                appointment = Appointment.objects.create(
                    client=target_client, employee=target_emp, barbershop=barbershop,
                    unit=target_unit, date=date_str, time=time_str, status=status_val,
                    total_price=0, notes=notes_str, is_paid=(status_val == 'completed')
                )
                msg = "Lançamento Retroativo criado com sucesso no histórico!"
            else:
                appointment = get_object_or_404(Appointment, id=app_id, barbershop=barbershop)
                if not is_owner:
                    if is_manager and appointment.unit != current_unit:
                        messages.error(request, "Acesso Negado.")
                        return redirect(f"{request.path}?{request.GET.urlencode()}")
                    elif not is_manager and appointment.employee != emp:
                        messages.error(request, "Acesso Negado.")
                        return redirect(f"{request.path}?{request.GET.urlencode()}")

                appointment.client = target_client
                appointment.employee = target_emp
                appointment.unit = target_unit
                appointment.date = date_str
                appointment.time = time_str
                appointment.status = status_val
                appointment.notes = notes_str
                
                if status_val == 'completed': appointment.is_paid = True
                elif status_val in ['cancelled', 'scheduled']: appointment.is_paid = False

                appointment.services.all().delete()
                msg = "Histórico de agendamento atualizado com sucesso!"

            total_price = Decimal('0.00')
            for sid in service_ids:
                svc = get_object_or_404(BarberService, id=sid)
                AppointmentService.objects.create(appointment=appointment, service=svc, price_at_sale=svc.price)
                total_price += svc.price
            
            appointment.total_price = total_price
            appointment.save()
            messages.success(request, msg)
            return redirect(f"{request.path}?{request.GET.urlencode()}")

        elif action == "delete_appointment":
            if not is_owner and not is_manager:
                messages.error(request, "Acesso Negado.")
                return redirect(f"{request.path}?{request.GET.urlencode()}")
            
            app_id = request.POST.get("appointment_id")
            appointment = get_object_or_404(Appointment, id=app_id, barbershop=barbershop)
            if is_manager and not is_owner and appointment.unit != current_unit:
                messages.error(request, "Acesso Negado.")
                return redirect(f"{request.path}?{request.GET.urlencode()}")
                
            appointment.delete()
            messages.success(request, "Excluído permanentemente do histórico!")
            return redirect(f"{request.path}?{request.GET.urlencode()}")

    date_filter = request.GET.get('date_filter', '')
    month_filter = request.GET.get('month_filter', '')
    barber_filter = request.GET.get('barber_filter', '')
    service_filter = request.GET.get('service_filter', '')
    status_filter = request.GET.get('status_filter', '')

    appointments = appointments.select_related('client', 'employee__user', 'unit').prefetch_related('services__service')
    
    if date_filter: appointments = appointments.filter(date=date_filter)
    if month_filter:
        try:
            year, month = month_filter.split('-')
            appointments = appointments.filter(date__year=year, date__month=month)
        except ValueError: pass
    
    if barber_filter: appointments = appointments.filter(employee_id=barber_filter)
    if service_filter: appointments = appointments.filter(services__service__base_service_id=service_filter)
    if status_filter: appointments = appointments.filter(status=status_filter)

    appointments = appointments.distinct().order_by('-date', '-time') 

    total_filtered_appointments = appointments.count()
    total_filtered_revenue = appointments.filter(status='completed').aggregate(total=Sum('total_price'))['total'] or 0.00

    paginator = Paginator(appointments, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    clients_list = Client.objects.filter(barbershop=barbershop).order_by('first_name')
    
    if is_owner:
        barbers_list = Employee.objects.filter(unit__barbershop=barbershop, roles__occupation__iexact='barbeiro', is_active=True).distinct()
        filter_services = BaseService.objects.filter(barberservice__employee__unit__barbershop=barbershop).distinct()
    elif is_manager or is_cashier:
        barbers_list = Employee.objects.filter(unit=current_unit, roles__occupation__iexact='barbeiro', is_active=True).distinct()
        filter_services = BaseService.objects.filter(barberservice__employee__unit=current_unit).distinct()
    else:
        barbers_list = [emp]
        filter_services = BaseService.objects.filter(barberservice__employee=emp).distinct()

    context = {
        'barbershop': barbershop, 'units': units, 'current_unit': current_unit, 'page_obj': page_obj,
        'date_filter': date_filter, 'month_filter': month_filter, 'barber_filter': barber_filter,
        'service_filter': service_filter, 'status_filter': status_filter,
        'total_filtered_appointments': total_filtered_appointments, 'total_filtered_revenue': total_filtered_revenue,
        'employees': barbers_list, 'filter_services': filter_services,
        'clients_list': clients_list, 'is_owner': is_owner, 'is_manager': is_manager, 'is_cashier': is_cashier, 'is_barber': is_barber,
    }

    return render(request, "scheduling/agendamentos.html", context)


# ==========================================
# ENDPOINTS DA API E MOTOR DE AGENDA SAAS
# ==========================================
@login_required 
def get_employees_by_unit(request):
    unit_id = request.GET.get('unit_id')
    if not unit_id or unit_id == 'null': 
        return JsonResponse({'employees': []})
    
    unit = get_object_or_404(Unit, id=unit_id)
    employees_qs = Employee.objects.filter(unit=unit, roles__occupation__iexact='barbeiro', is_active=True).select_related('user').distinct()
    
    data = []
    for emp in employees_qs:
        is_owner = (emp.user == unit.barbershop.owner_user)
        data.append({
            'id': emp.id, 
            'name': f"{emp.user.name} {emp.user.last_name}",
            'is_owner': is_owner
        })
    data.sort(key=lambda x: 0 if x['is_owner'] else 1)
    return JsonResponse({'employees': data})

@login_required 
def get_services_by_employee(request):
    employee_id = request.GET.get('employee_id')
    if not employee_id or employee_id == 'null': 
        return JsonResponse({'services': []})
    
    services = BarberService.objects.filter(employee_id=employee_id)
    data = [{
        'id': svc.id, 
        'name': svc.name, 
        'price': float(svc.price) if svc.price else 0.0,
        'duration': getattr(svc, 'duration', 30) or 30
    } for svc in services]
    return JsonResponse({'services': data})

@login_required
def get_available_slots(request):
    emp_id = request.GET.get('employee_id')
    date_str = request.GET.get('date')
    
    if not emp_id or emp_id == 'null' or not date_str: 
        return JsonResponse({'slots': []})

    try: duration = int(request.GET.get('duration', 30))
    except (TypeError, ValueError): duration = 30
    if duration <= 0: duration = 30
    
    app_id = request.GET.get('exclude_app_id') 
    # API Mágica: Permite requisitar slots passados se solicitado (ex: Histórico Retroativo)
    allow_past = request.GET.get('allow_past', 'false').lower() == 'true'

    emp = get_object_or_404(Employee, id=emp_id)
    try: target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError: return JsonResponse({'slots': []})

    if not allow_past and target_date < localdate(): return JsonResponse({'slots': []})

    if UnitHoliday.objects.filter(unit=emp.unit, date=target_date).exists():
        return JsonResponse({'slots': []})

    if EmployeeAbsence.objects.filter(employee=emp, start_date__lte=target_date, end_date__gte=target_date).exists():
        return JsonResponse({'slots': []})

    django_weekday = (target_date.weekday() + 1) % 7

    workday = EmployeeWorkDay.objects.filter(employee=emp, weekday=django_weekday).first()
    if not workday or (not workday.morning_available and not workday.afternoon_available):
        return JsonResponse({'slots': []})

    apps = Appointment.objects.filter(employee=emp, date=target_date).exclude(status__in=['cancelled', 'Cancelado'])
    if app_id: apps = apps.exclude(id=app_id)

    booked_intervals = []
    for app in apps:
        if not app.time: continue
        app_start = datetime.combine(target_date, app.time)
        app_dur = sum([(getattr(s.service, 'duration', 30) or 30) for s in app.services.all()])
        app_end = app_start + timedelta(minutes=app_dur)
        booked_intervals.append((app_start, app_end))

    slots = []
    current_local_time = localtime(now()).time()

    def generate_for_period(start_time, end_time):
        if not start_time or not end_time: return
        curr = datetime.combine(target_date, start_time)
        end = datetime.combine(target_date, end_time)
        
        while curr + timedelta(minutes=duration) <= end:
            slot_end = curr + timedelta(minutes=duration)
            
            # Se for hoje, o horário do slot deve ser maior que a hora atual (Somente na Agenda. Retroativo pula isso).
            if not allow_past and target_date == localdate() and curr.time() <= current_local_time:
                curr += timedelta(minutes=30)
                continue
                
            conflict = any(max(curr, b_start) < min(slot_end, b_end) for b_start, b_end in booked_intervals)
            
            if not conflict:
                slots.append(curr.strftime('%H:%M'))
            
            curr += timedelta(minutes=30)

    if workday.morning_available: generate_for_period(workday.start_morning_work, workday.end_morning_work)
    if workday.afternoon_available: generate_for_period(workday.start_afternoon_work, workday.end_afternoon_work)

    return JsonResponse({'slots': slots})