from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from .models import Unit, Barbershop, Employee, UnitWorkDay, EmployeeWorkDay, EmployeeAbsence, UnitHoliday, Role, UnitMedia
from decimal import Decimal, InvalidOperation
import re
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils.timezone import now
from django.db.models import Count
import json 
from django.http import JsonResponse
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.views.decorators.http import require_POST # Importe isso
from apps.user.utils.validators import validate_user_data
from functools import wraps
from django.core.exceptions import PermissionDenied





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
    # Só busca barbearia do usuário logado
    barbershop = get_object_or_404(Barbershop, slug=barbershop_slug)

    units = Unit.objects.filter(barbershop=barbershop).annotate(employee_count=Count('employees'))
    active_units_count = units.filter(is_active=True).count()
    gerente_unit = None
    if request.user.user_type == "gerente":
        employee = Employee.objects.filter(user=request.user).first()
        
        if employee:
            gerente_unit = employee.unit
    else:
        gerente_unit = None

    if request.method == "POST":
        action = request.POST.get("action")

        if action == "create":
            Unit.objects.create(
                name=request.POST.get("name"),
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
            return redirect("barbershop:units", barbershop_slug=barbershop.slug)

        if action == "edit":
            unit = get_object_or_404(Unit, pk=request.POST.get("unit_id"), barbershop=barbershop)
            unit.name = request.POST.get("name")
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
            return redirect("barbershop:units", barbershop_slug=barbershop.slug)

        if action == "delete":
            unit = get_object_or_404(Unit, pk=request.POST.get("unit_id"), barbershop=barbershop)
            unit.delete()
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
                        
                    if created:
                        messages.success(request, f"Funcionário {user.name} criado com sucesso!")
                    else:
                        messages.info(request, f"O usuário {user.name} já existia e foi adicionado como funcionário.")
                else:
                    messages.warning(request, f"O usuário {user.name} já é um funcionário desta barbearia.")

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

# Em apps/barbershop/views.py


@login_required
@owner_or_employee_required
def WorkDayView(request, barbershop_slug, unit_slug=None):
    barbershop = get_object_or_404(Barbershop, slug=barbershop_slug)
    
    # --- Lógica de Permissão ---
    gerente_unit = None
    current_employee = None # <-- NOVO
    
    if request.user.user_type == "gerente":
        employee = Employee.objects.filter(user=request.user).first()
        if employee:
            gerente_unit = employee.unit
    elif request.user.user_type == "funcionario": # <-- NOVO
        current_employee = Employee.objects.filter(user=request.user, unit__barbershop=barbershop).first()
        if not current_employee:
            messages.error(request, "Funcionário não encontrado nesta barbearia.")
            return redirect("core:home") # <-- MUDE PARA SUA URL DE 'HOME'
        
        # Trata o funcionário como um "gerente" da sua própria unidade para fins de filtro
        gerente_unit = current_employee.unit 

    # --- Processamento de POST ---
    if request.method == "POST":
        action = request.POST.get("action")

        # --- BLOQUEIO DE PERMISSÃO PARA FUNCIONÁRIO ---
        funcionario_allowed_actions = ["edit_workday"]
        if current_employee and action not in funcionario_allowed_actions:
            messages.error(request, "Você não tem permissão para executar esta ação.")
            if unit_slug: return redirect("barbershop:workday_unit", barbershop_slug=barbershop.slug, unit_slug=unit_slug)
            else: return redirect("barbershop:workday_general", barbershop_slug=barbershop.slug)

        # --- Bloco para editar a DISPONIBILIDADE ---
        if action == "edit_workday":
            emp_id = request.POST.get("employee_id")
            emp = get_object_or_404(Employee, id=emp_id, unit__barbershop=barbershop)
            
            # --- VERIFICAÇÃO DE PERMISSÃO NO POST ---
            if current_employee and emp.id != current_employee.id:
                messages.error(request, "Você só pode editar sua própria disponibilidade.")
                if unit_slug: return redirect("barbershop:workday_unit", barbershop_slug=barbershop.slug, unit_slug=unit_slug)
                else: return redirect("barbershop:workday_general", barbershop_slug=barbershop.slug)

            # (not current_employee) garante que isso só rode para donos ou gerentes
            if gerente_unit and not current_employee and emp.unit != gerente_unit:
                messages.error(request, "Você só pode editar funcionários da sua unidade.")
                if unit_slug: return redirect("barbershop:workday_unit", barbershop_slug=barbershop.slug, unit_slug=unit_slug)
                else: return redirect("barbershop:workday_general", barbershop_slug=barbershop.slug)
            
            # ... (O restante da sua lógica 'edit_workday' continua aqui...)
            for i in range(7):
                try:
                    workday = EmployeeWorkDay.objects.get(employee=emp, weekday=i)
                except EmployeeWorkDay.DoesNotExist:
                    workday = EmployeeWorkDay(employee=emp, weekday=i)
                # ... (resto do for loop) ...
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

            messages.success(request, f"Disponibilidade de {emp.user.name} atualizada com sucesso!")
            if unit_slug:
                return redirect("barbershop:workday_unit", barbershop_slug=barbershop.slug, unit_slug=unit_slug)
            else:
                return redirect("barbershop:workday_general", barbershop_slug=barbershop.slug)

        # ... (O restante do seu código POST continua aqui) ...
        elif action == "create_holiday":
            # ...
            pass # Seu código aqui
        elif action == "edit_holiday":
            # ...
            pass # Seu código aqui
        elif action == "delete_holiday":
            # ...
            pass # Seu código aqui
        elif action == "create_absence":
            # ...
            pass # Seu código aqui
        elif action == "delete_absence":
            # ...
            pass # Seu código aqui

        # Redirect genérico
        if unit_slug:
            return redirect("barbershop:workday_unit", barbershop_slug=barbershop.slug, unit_slug=unit_slug)
        else:
            return redirect("barbershop:workday_general", barbershop_slug=barbershop.slug)
    
    # --- LÓGICA GET (FILTROS DE DADOS) ---
    
    unit = None 
    
    # Se for Gerente OU Funcionário, 'gerente_unit' estará definida
    if gerente_unit:
        unit = gerente_unit
        units = [unit] 
        
        if current_employee: # <-- SE FOR FUNCIONÁRIO
            employees = Employee.objects.filter(id=current_employee.id).select_related("user", "unit")
            holidays = UnitHoliday.objects.filter(unit=unit, date__gte=now().date()).order_by("date") # Vê feriados da unidade
            absences = EmployeeAbsence.objects.filter(employee=current_employee, start_date__gte=now().date()).order_by("start_date") # Vê SÓ as suas folgas
        else: # <-- SE FOR GERENTE
            employees = Employee.objects.filter(unit=unit).select_related("user", "unit")
            holidays = UnitHoliday.objects.filter(unit=unit, date__gte=now().date()).order_by("date")
            absences = EmployeeAbsence.objects.filter(employee__unit=unit, start_date__gte=now().date()).order_by("start_date")
    
    else: # <-- SE FOR DONO
        units = barbershop.units.all() 
        
        if unit_slug:
            unit = get_object_or_404(Unit, slug=unit_slug, barbershop=barbershop)
            employees = Employee.objects.filter(unit=unit).select_related("user", "unit")
            holidays = UnitHoliday.objects.filter(unit=unit, date__gte=now().date()).order_by("date")
            absences = EmployeeAbsence.objects.filter(employee__unit=unit, start_date__gte=now().date()).order_by("start_date")
        else:
            employees = Employee.objects.filter(unit__barbershop=barbershop).select_related("user", "unit")
            holidays = UnitHoliday.objects.filter(unit__barbershop=barbershop, date__gte=now().date()).order_by("date")
            absences = EmployeeAbsence.objects.filter(employee__unit__barbershop=barbershop, start_date__gte=now().date()).order_by("start_date")

    # Esta lógica 'workdays' agora depende da 'employees' (que está corretamente filtrada)
    workdays = EmployeeWorkDay.objects.filter(employee__in=employees).order_by('weekday')

    # ... (O restante da sua lógica GET para 'workdays_data', 'time_options', etc. continua igual) ...
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
        # Adicione current_employee ao contexto se quiser usá-lo no template
        "current_employee": current_employee, 
    }
    return render(request, "barbershop/workDay.html", context)

@login_required
@require_POST
def check_employee_data(request):
    """
    Valida todos os dados do formulário de funcionário, tanto para CRIAÇÃO quanto para EDIÇÃO.
    """
    data = {
        "cpf": request.POST.get("cpf", ""),
        "name": request.POST.get("name", ""),
        "last_name": request.POST.get("last_name", ""),
        "email": request.POST.get("email", ""),
    }
    # Pegamos o ID do funcionário, se estivermos em modo de edição
    employee_id = request.POST.get('employee_id')

    # Usa a função de validação central que já temos
    errors = validate_user_data(data)

    # --- Validação de E-mail Único (Lógica Aprimorada para Edição) ---
    email = data.get('email')
    if email:
        user_query = User.objects.filter(email=email)
        if employee_id:
            # Se estamos editando, excluímos o próprio usuário da busca
            employee_user_id = Employee.objects.get(id=employee_id).user.id
            user_query = user_query.exclude(id=employee_user_id)
        
        if user_query.exists():
            errors.append("Email: Este e-mail já está em uso por outro usuário.")
            
    # --- Validação de CPF Único (Lógica Aprimorada para Edição) ---
    cpf_digits = re.sub(r'\D', '', data['cpf'])
    if cpf_digits:
        user_query = User.objects.filter(cpf=cpf_digits)
        if employee_id:
            employee_user_id = Employee.objects.get(id=employee_id).user.id
            user_query = user_query.exclude(id=employee_user_id)

        # Na edição, a gente não precisa mostrar o pop-up de confirmação,
        # pois o CPF não deveria mudar. Apenas validamos se não conflita com outro.
        if user_query.exists():
             errors.append("CPF: Este CPF já pertence a outro usuário.")


    if errors:
        return JsonResponse({'is_valid': False, 'errors': errors})

    # Se estamos criando e o CPF já existe (e não deu erro acima), acionamos a confirmação
    if not employee_id:
        try:
            user = User.objects.get(cpf=cpf_digits)
            return JsonResponse({
                'is_valid': True, 
                'user_exists': True, 
                'user_name': f'{user.name} {user.last_name}'
            })
        except User.DoesNotExist:
            pass # Continua para a resposta de sucesso abaixo

    return JsonResponse({'is_valid': True, 'user_exists': False})


@login_required
@owner_or_gerente_required
def MyWebsiteView(request, barbershop_slug):
    barbershop = get_object_or_404(Barbershop, slug=barbershop_slug)

    units = Unit.objects.filter(barbershop=barbershop)

    context = {
        "barbershop": barbershop,
        "barbershop_slug": barbershop_slug,
        "units": units,
        "active_units_count": units.filter(is_active=True).count(),
    }

    return render(request, "barbershop/myWebsite.html", context)
