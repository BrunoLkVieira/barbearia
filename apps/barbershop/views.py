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

# Imports do Dicionário de Dados Oficial
from apps.barbershop.models import Unit, Barbershop, Employee, UnitWorkDay, EmployeeWorkDay, EmployeeAbsence, UnitHoliday, Role, UnitMedia
from apps.client.models import Client 
from apps.scheduling.models import Appointment, AppointmentService
from apps.service.models import BarberService
from apps.user.utils.validators import validate_user_data

User = get_user_model()

def owner_or_employee_required(view_func):

    def wrapper(request, *args, **kwargs):

        if not request.user.is_authenticated or getattr(request.user, "user_type", None) not in ["dono", "funcionario", "gerente"]:

            messages.error(request,  "Acesso negado. Apenas donos, funcionários ou gerentes podem acessar.")

            return redirect("user:login")

        return view_func(request, *args, **kwargs)

    return wrapper


def owner_or_employee_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            messages.error(request, "Você precisa estar logado para acessar esta página.")
            return redirect("user:login") # Ajuste sua URL de login se necessário
            
        user_type = getattr(request.user, "user_type", None)
        if user_type not in ["dono", "funcionario", "gerente"]:
            messages.error(request, "Acesso negado.")
            # Redireciona para uma página 'home' genérica
            raise PermissionDenied
        return view_func(request, *args, **kwargs)
    return wrapper


# NOVO DECORADOR: Apenas "dono"
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


# NOVO DECORADOR: "dono" ou "gerente"
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
    """
    Retorna a unidade do gerente se o usuário for gerente,
    senão None
    """
    try:
        employee = user.employees.select_related("unit").get()
        role = employee.roles.filter(occupation=Role.Occupation.GERENTE).first()
        if role:
            return employee.unit
    except Employee.DoesNotExist:
        return None
    return None

@login_required
@owner_required
def UnitView(request, barbershop_slug):
    barbershop = get_object_or_404(Barbershop, slug=barbershop_slug)
    units = Unit.objects.filter(barbershop=barbershop).annotate(employee_count=Count('employees'))
    active_units_count = units.filter(is_active=True).count()
    
    # Lógica do gerente simplificada
    gerente_unit = None
    if request.user.user_type == "gerente":
        employee = Employee.objects.filter(user=request.user).first()
        if employee:
            gerente_unit = employee.unit

    if request.method == "POST":
        action = request.POST.get("action")
        name = request.POST.get("name", "").strip()

        # --- AÇÃO: CRIAR ---
        if action == "create":
            # Verifica se já existe uma unidade com esse nome NESTA barbearia
            if Unit.objects.filter(barbershop=barbershop, name=name).exists():
                return JsonResponse({
                    'is_valid': False, 
                    'errors': [f"A unidade '{name}' já existe nesta barbearia."]
                }, status=400)
            else:
                try:
                    new_unit = Unit.objects.create(
                        name=name,
                        cep_address=request.POST.get("cep_address"),
                        street_address=request.POST.get("street_address"),
                        number_address=request.POST.get("number_address"),
                        neighborhood=request.POST.get("neighborhood"),
                        city=request.POST.get("city"),
                        state=request.POST.get("state"),
                        whatsapp_number=request.POST.get("whatsapp_number"),
                        instagram_link=request.POST.get("instagram_link"),
                        is_active=request.POST.get("is_active") == "True",
                        barbershop=barbershop,
                    )
                    for i in range(7):
                        UnitWorkDay.objects.create(
                            unit=new_unit,
                            weekday=i,
                            open_time="09:00",
                            close_time="19:00",
                            is_open=True if i != 0 else False # Exemplo: Domingo (0) começa fechado
                        )
                    return JsonResponse({'is_valid': True, 'message': 'Unidade cadastrada com sucesso!'})
                except Exception:
                    return JsonResponse({'is_valid': False, 'errors': ['Erro interno ao salvar a unidade.']}, status=500)
            
          

        # --- AÇÃO: EDITAR ---
        if action == "edit":
            unit_id = request.POST.get("unit_id")
            unit = get_object_or_404(Unit, pk=unit_id, barbershop=barbershop)
            
            # Verifica duplicidade ignorando a própria unidade que está sendo editada
            if Unit.objects.filter(barbershop=barbershop, name=name).exclude(pk=unit_id).exists():
                return JsonResponse({
                    'is_valid': False, 
                    'errors': [f"Já existe outra unidade chamada '{name}'."]
                }, status=400)
            else:
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

        # --- AÇÃO: DELETAR ---
        if action == "delete":
            unit = get_object_or_404(Unit, pk=request.POST.get("unit_id"), barbershop=barbershop)
            unit.delete()
            messages.success(request, "Unidade excluída com sucesso.")
            return redirect("barbershop:units", barbershop_slug=barbershop.slug)

    return render(
        request,
        "barbershop/unit.html",
        {
            "barbershop": barbershop,
            "units": units,
            "user": request.user,
            "active_units_count": active_units_count,
            "gerente_unit": gerente_unit, 
        },
    )

User = get_user_model()

def _to_bool(val: str) -> bool:
    return str(val).lower() in ("on", "true", "1", "yes")

def _to_decimal(val):
    try:
        if val in (None, "",):
            return None
        return Decimal(str(val).replace(",", "."))
    except (InvalidOperation, ValueError, TypeError):
        return None

@login_required
@owner_or_gerente_required
def EmployeeView(request, barbershop_slug, unit_slug=None):
    # Barbershop do dono logado
    barbershop = get_object_or_404(Barbershop, slug=barbershop_slug)

    # Lógica para gerente (sem alterações)
    gerente_unit = None
    if request.user.user_type == "gerente":
        employee = Employee.objects.filter(user=request.user).first()
        if employee:
            gerente_unit = employee.unit
    else:
        gerente_unit = None

    unit = None
    if gerente_unit:
        unit = gerente_unit
        employees = Employee.objects.filter(unit=unit)
        units = [unit]
    else:
        if unit_slug:
            unit = get_object_or_404(Unit, slug=unit_slug, barbershop=barbershop)
            employees = Employee.objects.filter(unit=unit)
        else:
            employees = Employee.objects.filter(unit__barbershop=barbershop)
        units = barbershop.units.all()

    employees_active_count = employees.filter(user__is_active=True).count()

    if request.method == "POST":
        action = request.POST.get("action")

        # ---------- CREATE ----------
        if action == "create":
            # Coleta de dados básicos e de cargos (sem alterações)
            cpf = (request.POST.get("cpf") or "").strip()
            name = (request.POST.get("name") or "").strip()
            last_name = (request.POST.get("last_name") or "").strip()
            email = (request.POST.get("email") or "").strip()
            unit_id = request.POST.get("unit_id")
            roles_selected = request.POST.getlist("roles")
            
            # Bloco de Validações (sem alterações)
            errors = []
            cpf_digits = re.sub(r'\D', '', cpf)
            if len(cpf_digits) != 11:
                errors.append("CPF: Deve conter 11 dígitos.")
            if not name or name.isdigit():
                errors.append("Nome: Não pode estar em branco ou ser apenas números.")
            if not last_name or last_name.isdigit():
                errors.append("Sobrenome: Não pode estar em branco ou ser apenas números.")
            if not email:
                errors.append("Email: O campo de e-mail é obrigatório.")
            else:
                try: validate_email(email)
                except ValidationError: errors.append("Email: Formato de e-mail inválido.")
            if not unit_id:
                errors.append("Unidade: Você precisa selecionar uma unidade.")
            if not roles_selected:
                errors.append("Cargo: Você precisa selecionar pelo menos um cargo.")

            if errors:
                for error in errors:
                    messages.error(request, error)
                if unit_slug:
                    return redirect("barbershop:employee_unit", barbershop_slug=barbershop.slug, unit_slug=unit_slug)
                return redirect("barbershop:employee_general", barbershop_slug=barbershop.slug)
            
            unit = get_object_or_404(Unit, id=unit_id, barbershop=barbershop)

            with transaction.atomic():
                try:
                    user = User.objects.get(cpf=cpf_digits)
                    created = False
                except User.DoesNotExist:
                    if User.objects.filter(email=email).exists():
                        messages.error(request, f"Email: O e-mail '{email}' já está em uso por outro usuário.")
                        if unit_slug:
                             return redirect("barbershop:employee_unit", barbershop_slug=barbershop.slug, unit_slug=unit_slug)
                        return redirect("barbershop:employee_general", barbershop_slug=barbershop.slug)

                    user = User.objects.create(
                        cpf=cpf_digits, email=email, name=name, last_name=last_name,
                        phone=(request.POST.get("phone") or "").strip(), user_type="funcionario",
                    )
                    user.set_unusable_password()
                    user.save()
                    created = True

                if not Employee.objects.filter(user=user, unit__barbershop=barbershop).exists():
                    # ---> ADICIONADO <---
                    # Agora estamos passando TODOS os campos para o método create
                    employee = Employee.objects.create(
                        user=user,
                        unit=unit,
                        specialty=request.POST.get("specialty", "").strip(), 
                        bio=request.POST.get("bio", "").strip(),
                        commission_percentage=_to_bool(request.POST.get("commission_percentage")),
                        service_commission_percentage=_to_decimal(request.POST.get("service_commission_percentage")),
                        product_commission_percentage=_to_decimal(request.POST.get("product_commission_percentage")),
                        can_manage_cashbox=_to_bool(request.POST.get("can_manage_cashbox")),
                        can_register_sell=_to_bool(request.POST.get("can_register_sell")),
                        can_create_appointments=_to_bool(request.POST.get("can_create_appointments")),
                        system_access=_to_bool(request.POST.get("system_access")),
                    )
                    
                    for role_occupation in roles_selected:
                        Role.objects.create(employee=employee, occupation=role_occupation)

        # ---------- EDIT ----------
        elif action == "edit":
            emp = get_object_or_404(Employee, id=request.POST.get("employee_id"), unit__barbershop=barbershop)

            if gerente_unit:
                emp.unit = gerente_unit
            elif request.POST.get("unit_id"):
                unit_obj = get_object_or_404(Unit, id=request.POST.get("unit_id"), barbershop=barbershop)
                emp.unit = unit_obj

            # ---> CORRIGIDO <---
            # Removemos os `if "campo" in request.POST` para garantir que o campo
            # seja sempre atualizado, seja para True/False ou para um valor/None.
            emp.commission_percentage = _to_bool(request.POST.get("commission_percentage"))
            emp.service_commission_percentage = _to_decimal(request.POST.get("service_commission_percentage"))
            emp.product_commission_percentage = _to_decimal(request.POST.get("product_commission_percentage"))
            emp.can_manage_cashbox = _to_bool(request.POST.get("can_manage_cashbox"))
            emp.can_register_sell = _to_bool(request.POST.get("can_register_sell"))
            emp.can_create_appointments = _to_bool(request.POST.get("can_create_appointments"))
            emp.system_access = _to_bool(request.POST.get("system_access"))
            emp.specialty = request.POST.get("specialty", "").strip() # ADICIONADO
            emp.bio = request.POST.get("bio", "").strip()
            emp.save()

            # Atualização de roles (sem alterações)
            with transaction.atomic():
                emp.roles.all().delete()
                new_roles = request.POST.getlist("roles")
                for role_occupation in new_roles:
                    Role.objects.create(employee=emp, occupation=role_occupation)

            # Atualiza dados do usuário (sem alterações)
            user = emp.user
            changed_user_fields = []
            for field in ["name", "last_name", "email", "phone"]:
                if request.POST.get(field) is not None:
                    setattr(user, field, request.POST.get(field).strip())
                    changed_user_fields.append(field)
            if changed_user_fields:
                user.save(update_fields=changed_user_fields)
            
            messages.success(request, f"Dados de {user.name} atualizados com sucesso!")

        # ---------- DELETE ----------
        elif action == "delete":
            emp = get_object_or_404(Employee, id=request.POST.get("employee_id"), unit__barbershop=barbershop)
            user_name = emp.user.name
            emp.delete()
            messages.success(request, f"Funcionário {user_name} removido com sucesso.")

        # Redirecionamentos (sem alterações)
        if gerente_unit:
            return redirect("barbershop:employee_unit", barbershop_slug=barbershop.slug, unit_slug=gerente_unit.slug)
        if unit_slug:
            return redirect("barbershop:employee_unit", barbershop_slug=barbershop.slug, unit_slug=unit_slug)
        return redirect("barbershop:employee_general", barbershop_slug=barbershop.slug)

    # Contexto para a requisição GET
    role_choices = Role.Occupation.choices

    context = {
        "barbershop": barbershop,
        "units": units,
        "unit": unit,
        "employees": employees,
        "employees_active_count": employees_active_count,
        "gerente_unit": gerente_unit,
        "role_choices": role_choices,
    }
    return render(request, "barbershop/employee.html", context)


@login_required
@owner_or_employee_required
def WorkDayView(request, barbershop_slug, unit_slug=None):
    barbershop = get_object_or_404(Barbershop, slug=barbershop_slug)
    today = now().date()
    # --- Lógica de Permissão ---
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

    # Identificação da unidade
    unit = gerente_unit if gerente_unit else None
    if not unit and unit_slug:
        unit = get_object_or_404(Unit, slug=unit_slug, barbershop=barbershop)

    # --- Processamento de POST ---
    if request.method == "POST":
        action = request.POST.get("action")

        # --- BLOQUEIO DE PERMISSÃO PARA FUNCIONÁRIO ---
        funcionario_allowed_actions = ["edit_workday"]
        if current_employee and action not in funcionario_allowed_actions:
            return JsonResponse({
                'status': 'error',
                'errors': ['Você não tem permissão para executar esta ação.']
            }, status=403)

        # --- NOVO BLOCO: EDITAR FUNCIONAMENTO DA UNIDADE ---
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

        # --- Bloco para editar a DISPONIBILIDADE DO BARBEIRO ---
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

        # --- Ações de Holiday e Absence ---
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
    
    # --- LÓGICA GET ---
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

    # --- NOVO BLOCO: DADOS DA UNIDADE PARA O FUTURO MODAL ---
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
@require_POST
def check_employee_data(request):
    data = {
        "cpf": request.POST.get("cpf", ""),
        "name": request.POST.get("name", ""),
        "last_name": request.POST.get("last_name", ""),
        "email": request.POST.get("email", ""),
    }
    roles_selected = request.POST.getlist("roles")
    employee_id = request.POST.get('employee_id')
    
    # 1. Validação básica de campos (Niterói utils)
    errors = validate_user_data(data)

    # 2. Validação de Cargo (Obrigatório para o modal centralizado)
    if not roles_selected:
        errors.append("Cargo: Você precisa selecionar pelo menos um cargo.")

    # 3. Validação de E-mail Único
    email = data.get('email')
    if email:
        user_query = User.objects.filter(email=email)
        if employee_id:
            employee_user_id = Employee.objects.get(id=employee_id).user.id
            user_query = user_query.exclude(id=employee_user_id)
        if user_query.exists():
            errors.append("Email: Este e-mail já está em uso por outro usuário.")
            
    # 4. Validação de CPF Único
    cpf_digits = re.sub(r'\D', '', data['cpf'])
    if cpf_digits:
        user_query = User.objects.filter(cpf=cpf_digits)
        if employee_id:
            employee_user_id = Employee.objects.get(id=employee_id).user.id
            user_query = user_query.exclude(id=employee_user_id)
        if user_query.exists():
             errors.append("CPF: Este CPF já pertence a outro usuário.")

    # Se houver qualquer erro acima, retorna a lista para o SweetAlert centralizado
    if errors:
        return JsonResponse({'is_valid': False, 'errors': errors})

    # 5. Se for CRIAÇÃO e CPF já existe (mas não deu erro no banco desta barbearia)
    if not employee_id:
        try:
            user = User.objects.get(cpf=cpf_digits)
            return JsonResponse({
                'is_valid': True, 
                'user_exists': True, 
                'user_name': f'{user.name} {user.last_name}'
            })
        except User.DoesNotExist:
            pass

    return JsonResponse({'is_valid': True, 'user_exists': False})


@login_required
@owner_or_gerente_required
def MyWebsiteView(request, barbershop_slug, unit_slug=None):
    barbershop = get_object_or_404(Barbershop, slug=barbershop_slug)
    units = barbershop.units.all()
    unit = get_object_or_404(Unit, slug=unit_slug, barbershop=barbershop) if unit_slug else None

    if request.method == "POST":
        # A. Reordenação AJAX (Drag & Drop)
        if request.content_type == 'application/json':
            data = json.loads(request.body)
            if data.get('action') == 'update_order':
                for item in data.get('order', []):
                    UnitMedia.objects.filter(id=item['id']).update(order=item['position'])
                return JsonResponse({'status': 'ok'})

        action = request.POST.get("action")

        # B. Salvar Informações de Texto
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

        # C. ADICIONAR MÍDIA
        elif action == "add_media":
            m_type = request.POST.get("media_type")
            img = request.FILES.get("image")
            if unit and img:
                # Pega a última ordem para não zerar
                count = unit.media.filter(media_type=m_type).count()
                UnitMedia.objects.create(
                    unit=unit, 
                    media_type=m_type, 
                    image=img, 
                    order=count + 1
                )
                messages.success(request, "Imagem adicionada com sucesso!")
            return redirect(request.path)

        # D. DELETAR MÍDIA
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

    # --- NOVO: LÓGICA DE AGENDAMENTO ATIVO ---
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

    # --- LÓGICA DE AGRUPAMENTO ESTRATÉGICO ---
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
    
    data = [{
        'id': s.id, 
        'name': s.name, 
        'price': float(s.price), 
        'duration': s.duration,
        # Ícone bonito com fallback caso o dono esqueça de colocar
        'icon': s.base_service.icon if s.base_service and s.base_service.icon else 'fas fa-cut'
    } for s in services]
    
    return JsonResponse({'services': data})

@require_GET
def api_get_available_times(request, barbershop_slug):
    """Motor de cálculo de disponibilidade de agenda, Double Booking Block."""
    barber_id = request.GET.get('barber_id')
    date_str = request.GET.get('date')
    duration = int(request.GET.get('duration', 0))

    if not barber_id or not date_str or duration <= 0:
        return JsonResponse({'slots': []})

    try:
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return JsonResponse({'slots': []})

    # Correção de calendário: Python (Segunda=0) para o DB Orbly (Domingo=0)
    db_weekday = (target_date.weekday() + 1) % 7 
    employee = get_object_or_404(Employee, id=barber_id)

    # 1. Unidade está aberta neste dia da semana?
    if not UnitWorkDay.objects.filter(unit=employee.unit, weekday=db_weekday, is_open=True).exists():
        return JsonResponse({'slots': []})

    # 2. É Feriado na Unidade?
    if UnitHoliday.objects.filter(unit=employee.unit, date=target_date).exists():
        return JsonResponse({'slots': []})
        
    # 3. Barbeiro está de atestado/férias?
    if EmployeeAbsence.objects.filter(employee=employee, start_date__lte=target_date, end_date__gte=target_date).exists():
        return JsonResponse({'slots': []})

    # 4. Barbeiro trabalha neste dia específico da semana?
    try:
        workday = EmployeeWorkDay.objects.get(employee=employee, weekday=db_weekday)
        if not workday.morning_available and not workday.afternoon_available:
            return JsonResponse({'slots': []})
    except EmployeeWorkDay.DoesNotExist:
        return JsonResponse({'slots': []})

    # 5. Mapeia as reservas já existentes do dia
    # CORREÇÃO CRÍTICA: O campo FK correto na tabela AppointmentService é barber_service
    appointments = Appointment.objects.filter(
        employee=employee, date=target_date
    ).exclude(status='cancelado').prefetch_related('appointmentservice_set__barber_service')

    booked_periods = []
    for appt in appointments:
        if not appt.time: continue
        app_start = datetime.combine(target_date, appt.time)
        # Calcula a soma correta dos minutos dos serviços agendados (Double Booking Block)
        app_duration = sum((s.barber_service.duration if s.barber_service else 30) for s in appt.appointmentservice_set.all())
        if app_duration == 0: app_duration = 30
        app_end = app_start + timedelta(minutes=app_duration)
        booked_periods.append((app_start, app_end))

    # 6. Gera os Slots disponiveis
    available_slots = []
    from django.utils import timezone
    now_time = timezone.localtime().replace(tzinfo=None) # Ajuste de fuso

    def generate_slots(start_t, end_t):
        if not start_t or not end_t: return
        curr = datetime.combine(target_date, start_t)
        end = datetime.combine(target_date, end_t)
        
        while curr + timedelta(minutes=duration) <= end:
            slot_end = curr + timedelta(minutes=duration)
            conflict = False
            
            for b_start, b_end in booked_periods:
                # Se o horário que o cliente quer conflitar com o tempo de algum atendimento já marcado
                if curr < b_end and slot_end > b_start:
                    conflict = True
                    break
                    
            if not conflict:
                # Proteção para não agendar no passado se o dia for o de hoje
                if curr >= now_time:
                    available_slots.append(curr.strftime('%H:%M'))
            
            curr += timedelta(minutes=30)

    if workday.morning_available:
        generate_slots(workday.start_morning_work, workday.end_morning_work)
    if workday.afternoon_available:
        generate_slots(workday.start_afternoon_work, workday.end_afternoon_work)

    return JsonResponse({'slots': sorted(list(set(available_slots)))})