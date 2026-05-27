import json
import re
from datetime import datetime, date, timedelta
from decimal import Decimal, InvalidOperation
from itertools import groupby
from operator import itemgetter
from functools import wraps

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.core.validators import validate_email
from django.core.exceptions import ValidationError, PermissionDenied
from django.db import transaction, IntegrityError
from django.db.models import Count, Sum
from django.utils.timezone import now
from django.contrib.auth import authenticate, login, logout as auth_logout, get_user_model
from django.views.decorators.http import require_POST, require_GET

from apps.barbershop.models import Unit, Barbershop, Employee, UnitWorkDay, EmployeeWorkDay, EmployeeAbsence, UnitHoliday, Role, UnitMedia
from apps.client.models import Client 
from apps.scheduling.models import Appointment, AppointmentService
from apps.service.models import BarberService
from apps.user.utils.validators import validate_user_data

User = get_user_model()

def owner_or_employee_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            messages.error(request, "Você precisa estar logado para acessar esta página.")
            return redirect("user:login")
            
        user_type = getattr(request.user, "user_type", None)
        if user_type not in ["dono", "funcionario", "gerente"]:
            messages.error(request, "Acesso negado.")
            raise PermissionDenied
        return view_func(request, *args, **kwargs)
    return wrapper

def owner_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            messages.error(request, "Você precisa estar logado para acessar esta página.")
            return redirect("user:login")

        user_type = getattr(request.user, "user_type", None)
        if user_type != "dono":
            messages.error(request, "Acesso negado. Apenas o dono pode acessar esta página.")
            raise PermissionDenied
        return view_func(request, *args, **kwargs)
    return wrapper

def owner_or_gerente_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            messages.error(request, "Você precisa estar logado para acessar esta página.")
            return redirect("user:login")

        user_type = getattr(request.user, "user_type", None)
        if user_type not in ["dono", "gerente"]:
            messages.error(request, "Acesso negado. Apenas donos ou gerentes podem acessar esta página.")
            raise PermissionDenied
        return view_func(request, *args, **kwargs)
    return wrapper

def get_user_unit_if_manager(user):
    try:
        employee = user.employees.select_related("unit").get()
        role = employee.roles.filter(occupation=Role.Occupation.GERENTE).first()
        if role: return employee.unit
    except Employee.DoesNotExist:
        return None
    return None

def _to_bool(val: str) -> bool:
    return str(val).lower() in ("on", "true", "1", "yes")

def _to_decimal(val):
    try:
        if val in (None, "",): return None
        return Decimal(str(val).replace(",", "."))
    except (InvalidOperation, ValueError, TypeError):
        return None

# ==========================================
# MOTOR CIRÚRGICO DE LIMITES SAAS E INTEGRIDADE
# ==========================================
def calculate_consumed_slots(barbershop, exclude_emp_id=None, simulate_emp=None):
    """
    O Dono nunca consome vaga. 1 ADM (Gerente/Caixa) por filial é grátis.
    """
    consumed = 0
    for u in barbershop.units.all():
        emps = Employee.objects.filter(unit=u, is_active=True).exclude(user=barbershop.owner_user)
        if exclude_emp_id:
            emps = emps.exclude(id=exclude_emp_id)
        
        barbers_count = emps.filter(roles__occupation='barbeiro').distinct().count()
        admins_count = emps.exclude(roles__occupation='barbeiro').distinct().count()
        
        if simulate_emp and simulate_emp.get('is_active') and int(simulate_emp.get('unit_id', 0)) == u.id:
            if 'barbeiro' in simulate_emp.get('roles', []):
                barbers_count += 1
            else:
                admins_count += 1
                
        consumed += barbers_count + max(0, admins_count - 1)
    return consumed

def update_user_system_access(user):
    """Atualiza o user_type global baseado nos vínculos ativos na plataforma."""
    if user.user_type == 'dono': 
        return # Nunca rebaixa o dono
        
    is_employee_anywhere = Employee.objects.filter(user=user, is_active=True).exists()
    
    if is_employee_anywhere and user.user_type == 'cliente':
        user.user_type = 'funcionario'
        user.save()
    elif not is_employee_anywhere and user.user_type in ['funcionario', 'gerente']:
        user.user_type = 'cliente'
        user.save()


@login_required
@owner_required
def UnitView(request, barbershop_slug):
    barbershop = get_object_or_404(Barbershop, slug=barbershop_slug)
    units = Unit.objects.filter(barbershop=barbershop).annotate(employee_count=Count('employees'))
    active_units_count = units.filter(is_active=True).count()
    gerente_unit = None

    if request.method == "POST":
        action = request.POST.get("action")
        name = request.POST.get("name", "").strip()

        if action == "create":
            if Unit.objects.filter(barbershop=barbershop, name=name).exists():
                return JsonResponse({'is_valid': False, 'errors': [f"A unidade '{name}' já existe nesta barbearia."]}, status=400)
            try:
                new_unit = Unit.objects.create(
                    name=name, cep_address=request.POST.get("cep_address"), street_address=request.POST.get("street_address"),
                    number_address=request.POST.get("number_address"), neighborhood=request.POST.get("neighborhood"),
                    city=request.POST.get("city"), state=request.POST.get("state"), whatsapp_number=request.POST.get("whatsapp_number"),
                    instagram_link=request.POST.get("instagram_link"), is_active=request.POST.get("is_active") == "True",
                    barbershop=barbershop,
                )
                for i in range(7):
                    UnitWorkDay.objects.create(unit=new_unit, weekday=i, open_time="09:00", close_time="19:00", is_open=True if i != 0 else False)
                return JsonResponse({'is_valid': True, 'message': 'Unidade cadastrada com sucesso!'})
            except Exception:
                return JsonResponse({'is_valid': False, 'errors': ['Erro interno ao salvar a unidade.']}, status=500)
            
        if action == "edit":
            unit_id = request.POST.get("unit_id")
            unit = get_object_or_404(Unit, pk=unit_id, barbershop=barbershop)
            if Unit.objects.filter(barbershop=barbershop, name=name).exclude(pk=unit_id).exists():
                return JsonResponse({'is_valid': False, 'errors': [f"Já existe outra unidade chamada '{name}'."]}, status=400)
            
            unit.name = name
            unit.cep_address = request.POST.get("cep_address")
            unit.street_address = request.POST.get("street_address")
            unit.number_address = request.POST.get("number_address")
            unit.neighborhood = request.POST.get("neighborhood")
            unit.city = request.POST.get("city")
            unit.state = request.POST.get("state")
            unit.whatsapp_number = request.POST.get("whatsapp_number")
            unit.instagram_link = request.POST.get("instagram_link")
            unit.is_active = request.POST.get("is_active") == "True"
            unit.save()
            messages.success(request, "Alterações salvas com sucesso!")
            return JsonResponse({'is_valid': True, 'message': 'Alterações salvas com sucesso!'})

        if action == "delete":
            unit = get_object_or_404(Unit, pk=request.POST.get("unit_id"), barbershop=barbershop)
            unit.delete()
            messages.success(request, "Unidade excluída com sucesso.")
            return redirect("barbershop:units", barbershop_slug=barbershop.slug)

    return render(request, "barbershop/unit.html", {"barbershop": barbershop, "units": units, "user": request.user, "active_units_count": active_units_count, "gerente_unit": gerente_unit})


@login_required
@owner_or_gerente_required
def EmployeeView(request, barbershop_slug, unit_slug=None):
    barbershop = get_object_or_404(Barbershop, slug=barbershop_slug)

    gerente_unit = None
    if request.user.user_type == "gerente":
        employee = Employee.objects.filter(user=request.user).first()
        if employee: gerente_unit = employee.unit

    unit = gerente_unit if gerente_unit else None

    if unit:
        base_employees = Employee.objects.filter(unit=unit)
        units = [unit]
    else:
        if unit_slug:
            unit = get_object_or_404(Unit, slug=unit_slug, barbershop=barbershop)
            base_employees = Employee.objects.filter(unit=unit)
        else:
            base_employees = Employee.objects.filter(unit__barbershop=barbershop)
        units = barbershop.units.all()

    owner_employee = Employee.objects.filter(user=barbershop.owner_user, unit__barbershop=barbershop).first()
    owner_in_list = base_employees.filter(user=barbershop.owner_user).first()
    regular_employees = base_employees.exclude(user=barbershop.owner_user).order_by('-is_active', 'user__name')
    
    regular_employees_active_count = regular_employees.filter(is_active=True).count()
    consumed_slots = calculate_consumed_slots(barbershop)

    if request.method == "POST":
        action = request.POST.get("action")
        
        if action == "create_owner" and request.user == barbershop.owner_user:
            unit_id = request.POST.get("unit_id")
            unit_obj = get_object_or_404(Unit, id=unit_id, barbershop=barbershop)
            if not owner_employee:
                emp = Employee.objects.create(
                    user=barbershop.owner_user, unit=unit_obj, is_active=True,
                    system_access=True, can_manage_cashbox=True, 
                    can_register_sell=True, can_create_appointments=True
                )
                Role.objects.create(employee=emp, occupation=Role.Occupation.GERENTE)
                messages.success(request, "Você ingressou na operação com sucesso!")
            return redirect("barbershop:employee_general", barbershop_slug=barbershop.slug)

        cpf = (request.POST.get("cpf") or "").strip()
        cpf_digits = re.sub(r'\D', '', cpf)
        name = (request.POST.get("name") or "").strip()
        last_name = (request.POST.get("last_name") or "").strip()
        email = (request.POST.get("email") or "").strip()
        unit_id = request.POST.get("unit_id")
        roles_selected = request.POST.getlist("roles")
        is_active_val = 'is_active' in request.POST 

        if action == "create":
            simulate_emp = {'unit_id': unit_id, 'roles': roles_selected, 'is_active': is_active_val}
            if calculate_consumed_slots(barbershop, simulate_emp=simulate_emp) > barbershop.max_employees:
                messages.error(request, "Ação bloqueada. O limite de funcionários do seu plano foi atingido.")
                return redirect(request.path)

            unit_obj = get_object_or_404(Unit, id=unit_id, barbershop=barbershop)
            with transaction.atomic():
                try:
                    user = User.objects.get(cpf=cpf_digits)
                except User.DoesNotExist:
                    user = User.objects.create(
                        cpf=cpf_digits, email=email, name=name, last_name=last_name,
                        phone=(request.POST.get("phone") or "").strip()
                    )
                    user.set_unusable_password()
                    user.save()

                if not Employee.objects.filter(user=user, unit__barbershop=barbershop).exists():
                    employee = Employee.objects.create(
                        user=user, unit=unit_obj, specialty=request.POST.get("specialty", "").strip(), 
                        bio=request.POST.get("bio", "").strip(), is_active=is_active_val,
                        commission_percentage='commission_percentage' in request.POST,
                        service_commission_percentage=_to_decimal(request.POST.get("service_commission_percentage")),
                        product_commission_percentage=_to_decimal(request.POST.get("product_commission_percentage")),
                        can_manage_cashbox='can_manage_cashbox' in request.POST,
                        can_register_sell='can_register_sell' in request.POST,
                        can_create_appointments='can_create_appointments' in request.POST,
                        system_access='system_access' in request.POST,
                    )
                    for role_occ in roles_selected:
                        Role.objects.create(employee=employee, occupation=role_occ)
                        
                    update_user_system_access(user)
                    messages.success(request, f"Funcionário {user.name} salvo com sucesso!")

        elif action == "edit":
            emp_id = request.POST.get("employee_id")
            emp = get_object_or_404(Employee, id=emp_id, unit__barbershop=barbershop)
            
            if gerente_unit: emp.unit = gerente_unit
            elif request.POST.get("unit_id"): emp.unit = get_object_or_404(Unit, id=request.POST.get("unit_id"), barbershop=barbershop)

            if emp.user == barbershop.owner_user:
                emp.specialty = request.POST.get("specialty", "").strip() 
                emp.bio = request.POST.get("bio", "").strip()
                emp.commission_percentage = 'commission_percentage' in request.POST
                emp.service_commission_percentage = _to_decimal(request.POST.get("service_commission_percentage"))
                emp.product_commission_percentage = _to_decimal(request.POST.get("product_commission_percentage"))
                emp.save()
                
                emp.roles.all().delete()
                Role.objects.create(employee=emp, occupation=Role.Occupation.GERENTE)
                if 'owner_is_barber' in request.POST:
                    Role.objects.create(employee=emp, occupation=Role.Occupation.BARBEIRO)
                messages.success(request, "Perfil do Titular atualizado na operação.")
            
            else:
                simulate_emp = {'unit_id': request.POST.get("unit_id") or emp.unit.id, 'roles': roles_selected, 'is_active': is_active_val}
                if calculate_consumed_slots(barbershop, exclude_emp_id=emp.id, simulate_emp=simulate_emp) > barbershop.max_employees:
                    messages.error(request, "Ação bloqueada! Ativar este funcionário ou mudar seu cargo excederia o limite do seu plano.")
                    return redirect(request.path)

                emp.is_active = is_active_val
                
                user = emp.user
                changed_user_fields = []
                for field in ["name", "last_name", "email", "phone"]:
                    if request.POST.get(field) is not None and not user.user_type == 'dono':
                        setattr(user, field, request.POST.get(field).strip())
                        changed_user_fields.append(field)
                if changed_user_fields: user.save(update_fields=changed_user_fields)

                emp.commission_percentage = 'commission_percentage' in request.POST
                emp.service_commission_percentage = _to_decimal(request.POST.get("service_commission_percentage"))
                emp.product_commission_percentage = _to_decimal(request.POST.get("product_commission_percentage"))
                
                emp.system_access = 'system_access' in request.POST
                emp.can_manage_cashbox = 'can_manage_cashbox' in request.POST
                emp.can_register_sell = 'can_register_sell' in request.POST
                emp.can_create_appointments = 'can_create_appointments' in request.POST
                emp.specialty = request.POST.get("specialty", "").strip() 
                emp.bio = request.POST.get("bio", "").strip()
                emp.save()

                with transaction.atomic():
                    emp.roles.all().delete()
                    for role_occ in roles_selected:
                        Role.objects.create(employee=emp, occupation=role_occ)
                
                update_user_system_access(user)
                messages.success(request, f"Dados atualizados com sucesso!")

        elif action == "delete":
            emp = get_object_or_404(Employee, id=request.POST.get("employee_id"), unit__barbershop=barbershop)
            user_name = emp.user.name
            target_user = emp.user
            
            if emp.user == barbershop.owner_user:
                # O Dono pode apenas se "remover" da agenda/filial, mas a Orbly permite isso excluindo o Employee 
                # e mantendo o Owner intacto. Porém, o ideal é só remover a role Barbeiro.
                emp.delete()
                messages.success(request, "Você saiu da operação. Seu perfil Master continua intacto.")
            elif request.user.user_type == "gerente" and emp.user == request.user:
                messages.error(request, "Ação negada: Você não pode excluir a si mesmo.")
            else:
                if Appointment.objects.filter(employee=emp).exists():
                    emp.is_active = False
                    emp.save()
                    update_user_system_access(target_user)
                    messages.warning(request, f"O funcionário {user_name} foi INATIVADO para preservar o histórico financeiro e de agendamentos.")
                else:
                    emp.delete()
                    update_user_system_access(target_user)
                    messages.success(request, f"Funcionário {user_name} removido definitivamente da operação.")

        if gerente_unit: return redirect("barbershop:employee_unit", barbershop_slug=barbershop.slug, unit_slug=gerente_unit.slug)
        if unit_slug: return redirect("barbershop:employee_unit", barbershop_slug=barbershop.slug, unit_slug=unit_slug)
        return redirect("barbershop:employee_general", barbershop_slug=barbershop.slug)

    context = {
        "barbershop": barbershop,
        "units": units,
        "unit": unit,
        "owner_employee": owner_employee,
        "owner_in_list": owner_in_list,
        "regular_employees": regular_employees,
        "regular_employees_active_count": regular_employees_active_count,
        "consumed_slots": consumed_slots,
        "gerente_unit": gerente_unit,
        "role_choices": Role.Occupation.choices,
    }
    return render(request, "barbershop/employee.html", context)


@require_GET
@login_required
def api_check_cpf(request, barbershop_slug):
    """Nova API: Verifica se o CPF existe na base para Auto-Preenchimento"""
    cpf = re.sub(r'\D', '', request.GET.get('cpf', ''))
    if len(cpf) != 11:
        return JsonResponse({'valid': False})
    
    try:
        user = User.objects.get(cpf=cpf)
        emp = Employee.objects.filter(user=user, unit__barbershop__slug=barbershop_slug).first()
        if emp:
            return JsonResponse({
                'found': True, 'in_barbershop': True, 
                'message': 'Este CPF já é um funcionário cadastrado nesta barbearia.'
            })
        else:
            return JsonResponse({
                'found': True, 'in_barbershop': False,
                'name': user.name, 'last_name': user.last_name, 
                'email': user.email, 'phone': user.phone
            })
    except User.DoesNotExist:
        return JsonResponse({'found': False})


@login_required
@require_POST
def check_employee_data(request):
    """API de Validação AJAX: Trava erros antes do POST oficial."""
    data = {
        "cpf": request.POST.get("cpf", ""),
        "name": request.POST.get("name", ""),
        "last_name": request.POST.get("last_name", ""),
        "email": request.POST.get("email", ""),
    }
    roles_selected = request.POST.getlist("roles")
    employee_id = request.POST.get('employee_id')
    unit_id = request.POST.get('unit_id')
    is_active_val = 'is_active' in request.POST
    is_owner_val = 'is_owner' in request.POST
    
    if is_owner_val:
        return JsonResponse({'is_valid': True})

    errors = validate_user_data(data)
    if not roles_selected:
        errors.append("Cargo: Você precisa selecionar pelo menos um cargo.")

    # --- VALIDAÇÃO INTELIGENTE DE LIMITE SAAS AJAX ---
    if unit_id:
        target_unit = Unit.objects.select_related('barbershop').filter(id=unit_id).first()
        if target_unit:
            barbershop = target_unit.barbershop
            simulate_emp = {'unit_id': unit_id, 'roles': roles_selected, 'is_active': is_active_val}
            
            if calculate_consumed_slots(barbershop, exclude_emp_id=employee_id, simulate_emp=simulate_emp) > barbershop.max_employees:
                errors.append(f"Limite Atingido: O plano permite {barbershop.max_employees} vagas (O Titular e 1 admin por unidade são grátis).")

    email = data.get('email')
    cpf_digits = re.sub(r'\D', '', data['cpf'])

    if email:
        user_query = User.objects.filter(email=email)
        if employee_id:
            employee_user_id = Employee.objects.get(id=employee_id).user.id
            user_query = user_query.exclude(id=employee_user_id)
        if user_query.exists():
            # Apenas dá erro de email se já for um funcionário desta barbearia
            if Employee.objects.filter(user=user_query.first(), unit__barbershop__slug=request.POST.get('barbershop_slug')).exists():
                errors.append("Email: Este e-mail já pertence a um funcionário ativo na barbearia.")
            
    if cpf_digits:
        user_query = User.objects.filter(cpf=cpf_digits)
        if employee_id:
            employee_user_id = Employee.objects.get(id=employee_id).user.id
            user_query = user_query.exclude(id=employee_user_id)
        if user_query.exists():
            if Employee.objects.filter(user=user_query.first(), unit__barbershop__slug=request.POST.get('barbershop_slug')).exists():
                errors.append("CPF: Este CPF já é um funcionário desta barbearia.")

    if errors:
        return JsonResponse({'is_valid': False, 'errors': errors})
    return JsonResponse({'is_valid': True})

@login_required
@owner_or_employee_required
def WorkDayView(request, barbershop_slug, unit_slug=None):
    barbershop = get_object_or_404(Barbershop, slug=barbershop_slug)
    today = now().date()
    gerente_unit = None
    current_employee = None
    
    if request.user.user_type == "gerente":
        employee = Employee.objects.filter(user=request.user).first()
        if employee:
            gerente_unit = employee.unit
    elif request.user.user_type == "funcionario": 
        current_employee = Employee.objects.filter(user=request.user, unit__barbershop=barbershop).first()
        if not current_employee:
            messages.error(request, "Funcionário não encontrado nesta barbearia.")
            return redirect("core:home") 
        
        gerente_unit = current_employee.unit 

    unit = gerente_unit if gerente_unit else None
    if not unit and unit_slug:
        unit = get_object_or_404(Unit, slug=unit_slug, barbershop=barbershop)

    if request.method == "POST":
        action = request.POST.get("action")

        funcionario_allowed_actions = ["edit_workday"]
        if current_employee and action not in funcionario_allowed_actions:
            return JsonResponse({
                'status': 'error',
                'errors': ['Você não tem permissão para executar esta ação.']
            }, status=403)

        if action == "edit_unit_workdays":
            if not unit:
                return JsonResponse({'status': 'error', 'errors': ['Unidade não selecionada.']}, status=400)
            
            for i in range(7):
                try:
                    wd_unit = UnitWorkDay.objects.get(unit=unit, weekday=i)
                except UnitWorkDay.DoesNotExist:
                    wd_unit = UnitWorkDay(unit=unit, weekday=i)
                
                is_open = f'unit_open_{i}' in request.POST
                wd_unit.open_time = request.POST.get(f'unit_start_{i}') or "09:00"
                wd_unit.close_time = request.POST.get(f'unit_end_{i}') or "19:00"
                wd_unit.is_open = is_open
                wd_unit.save()

            return JsonResponse({
                'status': 'success', 
                'message': 'Horário de funcionamento da unidade atualizado!'
            })

        if action == "edit_workday":
            emp_id = request.POST.get("employee_id")
            emp = get_object_or_404(Employee, id=emp_id, unit__barbershop=barbershop)
            
            if current_employee and emp.id != current_employee.id:
                return JsonResponse({
                    'status': 'error',
                    'errors': ['Você só pode editar sua própria disponibilidade.']
                }, status=403)

            if gerente_unit and not current_employee and emp.unit != gerente_unit:
                return JsonResponse({
                    'status': 'error',
                    'errors': ['Você só pode editar funcionários da sua unidade.']
                }, status=403)

            for i in range(7):
                try:
                    workday = EmployeeWorkDay.objects.get(employee=emp, weekday=i)
                except EmployeeWorkDay.DoesNotExist:
                    workday = EmployeeWorkDay(employee=emp, weekday=i)
                
                morning_is_available = f'is_available_{i}_morning' in request.POST
                afternoon_is_available = f'is_available_{i}_afternoon' in request.POST

                workday.morning_available = morning_is_available
                workday.afternoon_available = afternoon_is_available
                workday.is_active = morning_is_available or afternoon_is_available

                start_morning = request.POST.get(f'start_morning_work_{i}')
                end_morning = request.POST.get(f'end_morning_work_{i}')
                start_afternoon = request.POST.get(f'start_afternoon_work_{i}')
                end_afternoon = request.POST.get(f'end_afternoon_work_{i}')

                workday.start_morning_work = start_morning if morning_is_available and start_morning else None
                workday.end_morning_work = end_morning if morning_is_available and end_morning else None
                workday.start_afternoon_work = start_afternoon if afternoon_is_available and start_afternoon else None
                workday.end_afternoon_work = end_afternoon if afternoon_is_available and end_afternoon else None
                
                workday.save()

            return JsonResponse({
                'status': 'success',
                'message': f'Disponibilidade de {emp.user.name} atualizada com sucesso!'
            })

        elif action == "create_holiday":
            date_str = request.POST.get("date")
            holiday_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            if holiday_date < today:
                return JsonResponse({'status': 'error', 'errors': ['A data não pode ser anterior à data atual.']}, status=400)
            else:
                unit_id = request.POST.get("unit_id")
                unit_obj = get_object_or_404(Unit, id=unit_id, barbershop=barbershop)
                UnitHoliday.objects.create(unit=unit_obj, date=holiday_date, name=request.POST.get("name"))
                return JsonResponse({'status': 'success', 'message': f"Feriado '{request.POST.get('name')}' adicionado!"})

        elif action == "edit_holiday":
            holiday_id = request.POST.get("holiday_id")
            holiday = get_object_or_404(UnitHoliday, id=holiday_id, unit__barbershop=barbershop)
            holiday.date, holiday.name = request.POST.get("date"), request.POST.get("name")
            holiday.save()
            return JsonResponse({'status': 'success', 'message': 'Feriado atualizado com sucesso'})

        elif action == "delete_holiday":
            holiday_id = request.POST.get("holiday_id")
            holiday = get_object_or_404(UnitHoliday, id=holiday_id, unit__barbershop=barbershop)
            holiday.delete()
            messages.success(request, "Feriado excluído com sucesso!")

        elif action == "create_absence":
            date_start_str = request.POST.get("date_start")
            date_end_str = request.POST.get("date_end")
            start_date = datetime.strptime(date_start_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(date_end_str, '%Y-%m-%d').date() if date_end_str else start_date
            if end_date < today:
                messages.error(request, "Não é possível registrar uma folga que já terminou.")
            else:
                emp_ids = request.POST.getlist("employee_id")
                for emp_id in emp_ids:
                    emp_obj = get_object_or_404(Employee, id=emp_id, unit__barbershop=barbershop)
                    EmployeeAbsence.objects.create(employee=emp_obj, start_date=start_date, end_date=end_date, reason=request.POST.get("reason", "Folga agendada"))
                messages.success(request, f"Folga(s) agendada(s) com sucesso!")
        
        elif action == "delete_absence":
            absence_id = request.POST.get("absence_id")
            absence = get_object_or_404(EmployeeAbsence, id=absence_id, employee__unit__barbershop=barbershop)
            absence.delete()
            messages.success(request, "Folga excluída com sucesso!")

        if unit_slug:
            return redirect("barbershop:workday_unit", barbershop_slug=barbershop.slug, unit_slug=unit_slug)
        else:
            return redirect("barbershop:workday_general", barbershop_slug=barbershop.slug)
    
    if gerente_unit:
        unit = gerente_unit
        units = [unit] 
        if current_employee:
            employees = Employee.objects.filter(id=current_employee.id).select_related("user", "unit")
            holidays = UnitHoliday.objects.filter(unit=unit, date__gte=now().date()).order_by("date")
            absences = EmployeeAbsence.objects.filter(employee=current_employee, end_date__gte=today).order_by("start_date")
        else:
            employees = Employee.objects.filter(unit=unit).select_related("user", "unit")
            holidays = UnitHoliday.objects.filter(unit=unit, date__gte=now().date()).order_by("date")
            absences = EmployeeAbsence.objects.filter(employee__unit=unit, end_date__gte=today).order_by("start_date")
    else:
        units = barbershop.units.all() 
        if unit_slug:
            unit = get_object_or_404(Unit, slug=unit_slug, barbershop=barbershop)
            employees = Employee.objects.filter(unit=unit).select_related("user", "unit")
            holidays = UnitHoliday.objects.filter(unit=unit, date__gte=now().date()).order_by("date")
            absences = EmployeeAbsence.objects.filter(employee__unit=unit,end_date__gte=today).order_by("start_date")
        else:
            employees = Employee.objects.filter(unit__barbershop=barbershop).select_related("user", "unit")
            holidays = UnitHoliday.objects.filter(unit__barbershop=barbershop, date__gte=now().date()).order_by("date")
            absences = EmployeeAbsence.objects.filter(employee__unit__barbershop=barbershop,end_date__gte=today).order_by("start_date")

    workdays = EmployeeWorkDay.objects.filter(employee__in=employees).order_by('weekday')

    workdays_data = {}
    for emp in employees:
        emp_data = {}
        emp_workdays = workdays.filter(employee=emp)
        for i in range(7):
            wd = next((d for d in emp_workdays if d.weekday == i), None)
            if wd:
                emp_data[i] = {
                    'morning_available': wd.morning_available,
                    'afternoon_available': wd.afternoon_available,
                    'start_morning_work': wd.start_morning_work.strftime('%H:%M') if wd.start_morning_work else '',
                    'end_morning_work': wd.end_morning_work.strftime('%H:%M') if wd.end_morning_work else '',
                    'start_afternoon_work': wd.start_afternoon_work.strftime('%H:%M') if wd.start_afternoon_work else '',
                    'end_afternoon_work': wd.end_afternoon_work.strftime('%H:%M') if wd.end_afternoon_work else '',
                }
            else:
                emp_data[i] = { 'morning_available': False, 'afternoon_available': False, 'start_morning_work': '', 'end_morning_work': '', 'start_afternoon_work': '', 'end_afternoon_work': '' }
        workdays_data[emp.id] = emp_data

    unit_workdays_list = unit.work_days.all().order_by('weekday') if unit else []
    unit_data_dict = {}
    if unit:
        if not unit_workdays_list.exists():
            unit_data_dict = {i: {'is_open': True, 'open_time': '09:00', 'close_time': '19:00'} for i in range(7)}
        else:
            for wd in unit_workdays_list:
                unit_data_dict[wd.weekday] = {
                    'is_open': wd.is_open,
                    'open_time': wd.open_time.strftime('%H:%M'),
                    'close_time': wd.close_time.strftime('%H:%M')
                }

    time_options = [f"{h:02d}:{m:02d}" for h in range(5, 24) for m in (0, 30)]

    context = {
        "barbershop": barbershop,
        "units": units,
        "unit": unit, 
        "employees": employees,
        "holidays": holidays,
        "absences": absences,
        "workdays": workdays,
        "gerente_unit": gerente_unit,
        "time_options": time_options,
        "workdays_json": json.dumps(workdays_data),
        "unit_workdays_json": unit_data_dict, 
        "unit_workdays": unit_workdays_list, 
        "current_employee": current_employee, 
    }
    return render(request, "barbershop/workDay.html", context)



@login_required
@owner_or_gerente_required
def MyWebsiteView(request, barbershop_slug, unit_slug=None):
    barbershop = get_object_or_404(Barbershop, slug=barbershop_slug)
    units = barbershop.units.all()
    unit = get_object_or_404(Unit, slug=unit_slug, barbershop=barbershop) if unit_slug else None

    if request.method == "POST":
        if request.content_type == 'application/json':
            data = json.loads(request.body)
            if data.get('action') == 'update_order':
                for item in data.get('order', []):
                    UnitMedia.objects.filter(id=item['id']).update(order=item['position'])
                return JsonResponse({'status': 'ok'})

        action = request.POST.get("action")

        if action == "save_info":
            if not unit:
                barbershop.name = request.POST.get("businessName")
                barbershop.foundation_date = request.POST.get("businessData") or None
                barbershop.description = request.POST.get("businessDescription")
                if request.FILES.get("logo"): barbershop.logo = request.FILES.get("logo")
                barbershop.save()
                return redirect('barbershop:myWebsite', barbershop_slug=barbershop.slug)
            else:
                unit.whatsapp_number = request.POST.get("whatsapp")
                unit.instagram_link = request.POST.get("instagram")
                unit.about_text = request.POST.get("aboutText")
                if request.FILES.get("about_image"): unit.about_image = request.FILES.get("about_image")
                unit.save()
            messages.success(request, "Alterações salvas!")
            return redirect(request.path)

        elif action == "add_media":
            m_type = request.POST.get("media_type")
            img = request.FILES.get("image")
            if unit and img:
                count = unit.media.filter(media_type=m_type).count()
                UnitMedia.objects.create(
                    unit=unit, 
                    media_type=m_type, 
                    image=img, 
                    order=count + 1
                )
                messages.success(request, "Imagem adicionada com sucesso!")
            return redirect(request.path)

        elif action == "delete_media":
            media_id = request.POST.get("media_id")
            UnitMedia.objects.filter(id=media_id).delete()
            messages.success(request, "Imagem removida.")
            return redirect(request.path)

    context = {
        "barbershop": barbershop, "unit": unit, "units": units,
        "active_units_count": units.filter(is_active=True).count(),
        "media_banners": unit.media.filter(media_type="banner").order_by('order') if unit else [],
        "media_hairstyles": unit.media.filter(media_type="hairstyle").order_by('order') if unit else [],
        "media_products": unit.media.filter(media_type="product").order_by('order') if unit else [],
    }
    return render(request, "barbershop/myWebsite.html", context)


def UnitLP(request, barbershop_slug, unit_slug=None):
    barbershop = get_object_or_404(Barbershop, slug=barbershop_slug)
    units = Unit.objects.filter(barbershop=barbershop, is_active=True)
    
    if unit_slug:
        unit = get_object_or_404(Unit, slug=unit_slug, barbershop=barbershop)
    else:
        unit = units.first()

    barbers = []
    if unit:
        barbers = Employee.objects.filter(unit=unit, roles__occupation='barbeiro').select_related('user').distinct()

    has_active_appointment = False
    active_appointment = None

    if request.user.is_authenticated:
        client = Client.objects.filter(user=request.user, barbershop=barbershop).first()
        if client:
            active_appointment = Appointment.objects.filter(
                client=client,
                barbershop=barbershop,
                status='scheduled',
                date__gte=now().date()
            ).order_by('date', 'time').first()
            if active_appointment:
                has_active_appointment = True

    grouped_hours = []
    if unit:
        all_days = list(unit.work_days.all())
        all_days.sort(key=lambda x: x.weekday if x.weekday != 0 else 7)

        open_days = [d for d in all_days if d.is_open]
        closed_days = [d for d in all_days if not d.is_open]

        temp_map = {}
        for d in open_days:
            label = f"{d.open_time.strftime('%H:%M')} - {d.close_time.strftime('%H:%M')}"
            if label not in temp_map: temp_map[label] = []
            temp_map[label].append(d)

        processed_labels = []
        for d in open_days:
            label = f"{d.open_time.strftime('%H:%M')} - {d.close_time.strftime('%H:%M')}"
            if label in processed_labels: continue
            
            indices = sorted([wd.weekday if wd.weekday != 0 else 7 for wd in temp_map[label]])
            
            sequences = []
            for k, g in groupby(enumerate(indices), lambda x: x[0] - x[1]):
                group = list(map(itemgetter(1), g))
                day_names = {1:'Segunda', 2:'Terça', 3:'Quarta', 4:'Quinta', 5:'Sexta', 6:'Sábado', 7:'Domingo'}
                
                if len(group) > 1:
                    sequences.append(f"{day_names[group[0]]} a {day_names[group[-1]]}")
                else:
                    sequences.append(day_names[group[0]])
            
            grouped_hours.append({'days': ", ".join(sequences), 'hours': label, 'is_open': True})
            processed_labels.append(label)

        if closed_days:
            closed_names = []
            for d in closed_days:
                name = {1:'Segunda', 2:'Terça', 3:'Quarta', 4:'Quinta', 5:'Sexta', 6:'Sábado', 0:'Domingo'}[d.weekday]
                closed_names.append(name)
            grouped_hours.append({'days': ", ".join(closed_names), 'hours': 'Fechado', 'is_open': False})

    context = {
        "barbershop": barbershop, "unit": unit, "units": units, "barbers": barbers,
        "banners": unit.media.filter(media_type="banner").order_by('order') if unit else [],
        "hairstyles": unit.media.filter(media_type="hairstyle").order_by('order') if unit else [],
        "products": unit.media.filter(media_type="product").order_by('order') if unit else [],
        "grouped_hours": grouped_hours,
        "has_active_appointment": has_active_appointment,
        "active_appointment": active_appointment,
    }
    return render(request, "barbershop/unitLP.html", context)


# =========================================================
# APIs ASYNC DA LANDING PAGE (ISOLADAS DO CORE)
# =========================================================

@require_POST
def api_login(request, barbershop_slug):
    try:
        data = json.loads(request.body)
        cpf = re.sub(r'\D', '', data.get('cpf', ''))
        password = data.get('password')
        
        user = authenticate(request, username=cpf, password=password)
        if user is None:
            user = authenticate(request, cpf=cpf, password=password)
            
        if user is not None:
            login(request, user)
            
            barbershop = Barbershop.objects.get(slug=barbershop_slug)
            Client.objects.get_or_create(
                user=user, 
                barbershop=barbershop,
                defaults={
                    'first_name': user.name.split()[0] if user.name else "",
                    'last_name': " ".join(user.name.split()[1:]) if user.name and len(user.name.split()) > 1 else "",
                    'email': user.email,
                    'phone': user.phone,
                    'cpf': user.cpf
                }
            )
            return JsonResponse({'status': 'success'})
        else:
            return JsonResponse({'status': 'error', 'message': 'CPF ou senha inválidos.'}, status=401)
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@require_POST
def api_register(request, barbershop_slug):
    try:
        data = json.loads(request.body)
        name = data.get('name')
        email = data.get('email')
        cpf = re.sub(r'\D', '', data.get('cpf', ''))
        phone = re.sub(r'\D', '', data.get('phone', ''))
        password = data.get('password')
        
        if User.objects.filter(email=email).exists():
            return JsonResponse({'status': 'error', 'message': 'Este e-mail já está em uso.'}, status=400)
        if User.objects.filter(cpf=cpf).exists():
            return JsonResponse({'status': 'error', 'message': 'Este CPF já está cadastrado.'}, status=400)
            
        user = User.objects.create_user(
            cpf=cpf,
            email=email,
            password=password,
            name=name,
            phone=phone,
            user_type='cliente'
        )
        
        barbershop = Barbershop.objects.get(slug=barbershop_slug)
        Client.objects.create(
            user=user, 
            barbershop=barbershop,
            first_name=name.split()[0],
            last_name=" ".join(name.split()[1:]) if len(name.split()) > 1 else "",
            email=email,
            phone=phone,
            cpf=cpf
        )
        
        login(request, user)
        return JsonResponse({'status': 'success'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@require_POST
def api_logout(request, barbershop_slug):
    auth_logout(request)
    return JsonResponse({'status': 'success'})


@require_POST
@login_required
def api_cancel_appointment(request, barbershop_slug):
    try:
        data = json.loads(request.body)
        appointment_id = data.get('appointment_id')
        appointment = Appointment.objects.get(
            id=appointment_id, 
            client__user=request.user, 
            barbershop__slug=barbershop_slug,
            status='scheduled'
        )
        appointment.status = 'cancelado'
        appointment.save()
        return JsonResponse({'status': 'success'})
    except Appointment.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Agendamento não encontrado.'}, status=404)
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@require_POST
def process_booking_api(request, barbershop_slug):
    if not request.user.is_authenticated:
        return JsonResponse({'status': 'error', 'message': 'Sessão expirada. Faça login novamente.'}, status=401)

    try:
        data = json.loads(request.body)
        client = Client.objects.get(user=request.user, barbershop__slug=barbershop_slug)
        employee = Employee.objects.get(id=data.get('barber_id'))
        unit = Unit.objects.get(id=data.get('unit_id'))
        
        # Cria a reserva mãe
        appointment = Appointment.objects.create(
            client=client,
            employee=employee,
            barbershop=client.barbershop,
            unit=unit,
            date=data.get('date'),
            time=data.get('time'),
            status='scheduled'
        )
        
        # Atrela os serviços e soma o valor
        total_price = 0
        service_ids = data.get('service_id')
        if not isinstance(service_ids, list):
            service_ids = [service_ids]
            
        for s_id in service_ids:
            service = BarberService.objects.get(id=s_id)
            AppointmentService.objects.create(
                appointment=appointment,
                service=service,
                price_at_sale=service.price
            )
            total_price += service.price
            
        appointment.total_price = total_price
        appointment.save()

        return JsonResponse({'status': 'success'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@require_GET
def api_get_barbers(request, barbershop_slug):
    unit_id = request.GET.get('unit_id')
    if not unit_id:
        return JsonResponse({'barbers': []})

    barbers = Employee.objects.filter(
        unit_id=unit_id, 
        roles__occupation='barbeiro', 
        user__is_active=True
    ).select_related('user')

    data = [{
        'id': b.id, 
        'name': f"{b.user.name} {b.user.last_name}", 
        'initials': f"{b.user.name[:1]}{b.user.last_name[:1]}".upper()
    } for b in barbers]
    
    return JsonResponse({'barbers': data})


@require_GET
def api_get_services(request, barbershop_slug):
    barber_id = request.GET.get('barber_id')
    if not barber_id:
        return JsonResponse({'services': []})

    services = BarberService.objects.filter(employee_id=barber_id).select_related('base_service')
    
    data = []
    for s in services:
        icon_str = s.base_service.icon if s.base_service and s.base_service.icon else 'fas fa-cut'
        
        # Correção de fallback para garantir compatibilidade com FontAwesome 6
        if not icon_str.startswith('fa'):
            icon_str = f'fas {icon_str}'
        elif not icon_str.startswith('fas ') and not icon_str.startswith('fab '):
            icon_str = f'fas {icon_str}'

        data.append({
            'id': s.id, 
            'name': s.name, 
            'price': float(s.price), 
            'duration': s.duration,
            'icon': icon_str
        })
    
    return JsonResponse({'services': data})


@require_GET
def api_get_available_times(request, barbershop_slug):
    """Motor matemático de disponibilidade com bloqueio perfeito de Double Booking."""
    barber_id = request.GET.get('barber_id')
    date_str = request.GET.get('date')
    duration = int(request.GET.get('duration', 0))

    if not barber_id or not date_str or duration <= 0:
        return JsonResponse({'slots': []})

    try:
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return JsonResponse({'slots': []})

    try:
        db_weekday = (target_date.weekday() + 1) % 7 
        employee = get_object_or_404(Employee, id=barber_id)

        if not UnitWorkDay.objects.filter(unit=employee.unit, weekday=db_weekday, is_open=True).exists():
            return JsonResponse({'slots': []})

        if UnitHoliday.objects.filter(unit=employee.unit, date=target_date).exists():
            return JsonResponse({'slots': []})
            
        if EmployeeAbsence.objects.filter(employee=employee, start_date__lte=target_date, end_date__gte=target_date).exists():
            return JsonResponse({'slots': []})

        try:
            workday = EmployeeWorkDay.objects.get(employee=employee, weekday=db_weekday)
            if not workday.morning_available and not workday.afternoon_available:
                return JsonResponse({'slots': []})
        except EmployeeWorkDay.DoesNotExist:
            return JsonResponse({'slots': []})

        # --- BUGFIX RESOLVIDO AQUI: Blindagem da Query e Mapeamento de Horários ---
        appointments = Appointment.objects.filter(
            employee=employee, date=target_date
        ).exclude(status__in=['cancelado', 'Cancelado', 'canceled', 'cancelled']).prefetch_related('services__service')

        booked_periods = []
        for appt in appointments:
            if not appt.time: continue
            app_start = datetime.combine(target_date, appt.time)
            
            # Cálculo cirúrgico do tempo de duração do agendamento 
            app_duration = 0
            for s in appt.services.all():
                if s.service:
                    app_duration += s.service.duration
            if app_duration <= 0:
                app_duration = 30
                
            app_end = app_start + timedelta(minutes=app_duration)
            booked_periods.append((app_start, app_end))

        available_slots = []
        now_time = datetime.now() 

        def generate_slots(start_t, end_t):
            if not start_t or not end_t: return
            curr = datetime.combine(target_date, start_t)
            end = datetime.combine(target_date, end_t)
            
            while curr + timedelta(minutes=duration) <= end:
                slot_end = curr + timedelta(minutes=duration)
                conflict = False
                
                for b_start, b_end in booked_periods:
                    # O overlap só existe se o início de um for estritamente menor que o fim do outro e vice-versa
                    if max(curr, b_start) < min(slot_end, b_end):
                        conflict = True
                        break
                        
                if not conflict:
                    if curr >= now_time: 
                        available_slots.append(curr.strftime('%H:%M'))
                
                # O Pulo da Grade: Mantém a barra em 30 min, gerando respiro caso existam quebras.
                curr += timedelta(minutes=30)

        if workday.morning_available:
            generate_slots(workday.start_morning_work, workday.end_morning_work)
        if workday.afternoon_available:
            generate_slots(workday.start_afternoon_work, workday.end_afternoon_work)

        return JsonResponse({'slots': sorted(list(set(available_slots)))})
        
    except Exception as e:
        print(f"Erro Backend Orbly (Available Times): {e}") 
        return JsonResponse({'slots': []})