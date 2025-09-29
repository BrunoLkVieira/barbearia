from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from .models import Unit, Barbershop, Employee, UnitWorkDay, EmployeeWorkDay, EmployeeAbsence, UnitHoliday, Role, UnitMedia
from decimal import Decimal, InvalidOperation
import re

from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.shortcuts import get_object_or_404, redirect, render
from django.utils.timezone import now
from .models import Barbershop, Unit, Employee
from django.db.models import Count
import json 
from django.utils.timezone import now

def owner_or_employee_required(view_func):
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated or getattr(request.user, "user_type", None) not in ["dono", "funcionario", "gerente"]:
            messages.error(request,  "Acesso negado. Apenas donos, funcionários ou gerentes podem acessar.")
            return redirect("user:login")
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
@owner_or_employee_required
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
@owner_or_employee_required
def EmployeeView(request, barbershop_slug, unit_slug=None):
    # Barbershop do dono logado
    barbershop = get_object_or_404(Barbershop, slug=barbershop_slug)

    # Verifica se o usuário é gerente e pega a unidade dele
    gerente_unit = None
    if request.user.user_type == "gerente":
        employee = Employee.objects.filter(user=request.user).first()
        
        if employee:
            gerente_unit = employee.unit
    else:
        gerente_unit = None


    unit = None

    if gerente_unit:
        # Usuário é gerente -> só vê a própria unidade
        unit = gerente_unit
        employees = Employee.objects.filter(unit=unit)
        units = [unit]
    else:
        # Dono ou outro tipo de acesso
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
            # Dados do USER
            raw_cpf = (request.POST.get("cpf") or "").strip()
            cpf = re.sub(r"\D", "", raw_cpf)
            name = (request.POST.get("name") or "").strip()
            last_name = (request.POST.get("last_name") or "").strip()
            email = (request.POST.get("email") or "").strip()
            phone = (request.POST.get("phone") or "").strip()

            # Dados do EMPLOYEE
            unit_id = request.POST.get("unit_id")

            # Se for gerente, força a unidade dele
            if gerente_unit:
                unit_id = gerente_unit.id

            unit = get_object_or_404(Unit, id=unit_id, barbershop=barbershop)

            commission_percentage = _to_bool(request.POST.get("commission_percentage"))
            service_commission_percentage = _to_decimal(request.POST.get("service_commission_percentage"))
            product_commission_percentage = _to_decimal(request.POST.get("product_commission_percentage"))
            can_manage_cashbox = _to_bool(request.POST.get("can_manage_cashbox"))
            can_register_sell = _to_bool(request.POST.get("can_register_sell"))
            can_create_appointments = _to_bool(request.POST.get("can_create_appointments"))
            system_access = _to_bool(request.POST.get("system_access"))

            if not cpf:
                return redirect("barbershop:employee", barbershop_slug=barbershop.slug)

            with transaction.atomic():
                user, created = User.objects.get_or_create(
                    cpf=cpf,
                    defaults={
                        "email": email or None,
                        "name": name or "",
                        "last_name": last_name or "",
                        "phone": phone or None,
                        "user_type": "funcionario",
                        "is_active": True,
                    },
                )
                if created:
                    user.set_unusable_password()
                    user.save()
                else:
                    if getattr(user, "user_type", None) != "dono":
                        user.user_type = "funcionario"
                        user.save(update_fields=["user_type"])

                employee, emp_created = Employee.objects.get_or_create(
                    user=user,
                    unit=unit,
                    defaults={
                        "commission_percentage": commission_percentage,
                        "service_commission_percentage": service_commission_percentage,
                        "product_commission_percentage": product_commission_percentage,
                        "can_manage_cashbox": can_manage_cashbox,
                        "can_register_sell": can_register_sell,
                        "can_create_appointments": can_create_appointments,
                        "system_access": system_access,
                    },
                )
                if not emp_created:
                    employee.commission_percentage = commission_percentage
                    employee.service_commission_percentage = service_commission_percentage
                    employee.product_commission_percentage = product_commission_percentage
                    employee.can_manage_cashbox = can_manage_cashbox
                    employee.can_register_sell = can_register_sell
                    employee.can_create_appointments = can_create_appointments
                    employee.system_access = system_access
                    employee.save()

        # ---------- EDIT ----------
        elif action == "edit":
            emp = get_object_or_404(
                Employee,
                id=request.POST.get("employee_id"),
                unit__barbershop=barbershop,
            )

            # Se for gerente, força a unidade dele
            if gerente_unit:
                emp.unit = gerente_unit
            elif request.POST.get("unit_id"):
                unit = get_object_or_404(Unit, id=request.POST.get("unit_id"), barbershop=barbershop)
                emp.unit = unit

            # Atualiza campos
            if "commission_percentage" in request.POST:
                emp.commission_percentage = _to_bool(request.POST.get("commission_percentage"))
            if "service_commission_percentage" in request.POST:
                emp.service_commission_percentage = _to_decimal(request.POST.get("service_commission_percentage"))
            if "product_commission_percentage" in request.POST:
                emp.product_commission_percentage = _to_decimal(request.POST.get("product_commission_percentage"))
            if "can_manage_cashbox" in request.POST:
                emp.can_manage_cashbox = _to_bool(request.POST.get("can_manage_cashbox"))
            if "can_register_sell" in request.POST:
                emp.can_register_sell = _to_bool(request.POST.get("can_register_sell"))
            if "can_create_appointments" in request.POST:
                emp.can_create_appointments = _to_bool(request.POST.get("can_create_appointments"))
            if "system_access" in request.POST:
                emp.system_access = _to_bool(request.POST.get("system_access"))
            emp.save()

            # Atualiza dados do usuário
            user = emp.user
            changed_user_fields = []
            for field in ["name", "last_name", "email", "phone"]:
                if request.POST.get(field):
                    setattr(user, field, request.POST.get(field).strip())
                    changed_user_fields.append(field)
            if changed_user_fields:
                user.save(update_fields=changed_user_fields)

        # ---------- DELETE ----------
        elif action == "delete":
            emp = get_object_or_404(
                Employee,
                id=request.POST.get("employee_id"),
                unit__barbershop=barbershop,
            )
            emp.delete()

        if gerente_unit:
            return redirect("barbershop:employee_unit", 
                            barbershop_slug=barbershop.slug, 
                            unit_slug=gerente_unit.slug)

        # Se o dono estava vendo uma unidade específica, mantém essa visão.
        # A variável 'unit_slug' vem dos parâmetros da URL da página atual.
        if unit_slug:
            return redirect("barbershop:employee_unit", 
                            barbershop_slug=barbershop.slug, 
                            unit_slug=unit_slug)

        # Caso contrário, redireciona para a visão geral de todos os funcionários.
        return redirect("barbershop:employee_general", 
                        barbershop_slug=barbershop.slug)

    context = {
        "barbershop": barbershop,
        "units": units,
        "unit": unit,
        "employees": employees,
        "employees_active_count": employees_active_count,
        "gerente_unit": gerente_unit
    }
    return render(request, "barbershop/employee.html", context)




@login_required
@owner_or_employee_required
def WorkDayView(request, barbershop_slug, unit_slug=None):
    barbershop = get_object_or_404(Barbershop, slug=barbershop_slug)
    units = barbershop.units.all()
    employees = Employee.objects.filter(unit__barbershop=barbershop).select_related("user", "unit")
    gerente_unit = None
    if request.user.user_type == "gerente":
        employee = Employee.objects.filter(user=request.user).first()
        if employee:
            gerente_unit = employee.unit

    if request.method == "POST":
        action = request.POST.get("action")

        # ---------- EDIT WORKDAY (LÓGICA ATUALIZADA COM OS NOMES CORRETOS) ----------
        if action == "edit_workday":
          emp_id = request.POST.get("employee_id")
          emp = get_object_or_404(Employee, id=emp_id, unit__barbershop=barbershop)
          
          for i in range(7):
            is_active = request.POST.get(f'is_active_{i}') == 'on'
            
            start_morning = request.POST.get(f'start_morning_work_{i}')
            end_morning = request.POST.get(f'end_morning_work_{i}')
            start_afternoon = request.POST.get(f'start_afternoon_work_{i}')
            end_afternoon = request.POST.get(f'end_afternoon_work_{i}')

            # --- 💡 MODIFICAÇÃO AQUI 💡 ---
            # Trocamos get_or_create por get, pois agora temos certeza que o registro já existe.
            try:
                workday = EmployeeWorkDay.objects.get(employee=emp, weekday=i)
            except EmployeeWorkDay.DoesNotExist:
                # Esta exceção não deve acontecer com a nova lógica de Sinais,
                # mas é uma boa prática para evitar que o site quebre.
                continue 
            
            workday.is_active = is_active
            workday.morning_available = is_active 
            workday.afternoon_available = is_active

            # A lógica de salvar 'None' continua correta, desde que o modelo permita
            workday.start_morning_work = start_morning if is_active and start_morning else None
            workday.end_morning_work = end_morning if is_active and end_morning else None
            workday.start_afternoon_work = start_afternoon if is_active and start_afternoon else None
            workday.end_afternoon_work = end_afternoon if is_active and end_afternoon else None
            
            workday.save()

            if unit_slug:
                return redirect("barbershop:workday_unit", barbershop_slug=barbershop.slug, unit_slug=unit_slug)
            else:
                return redirect("barbershop:workday_general", barbershop_slug=barbershop.slug)

        # ---------- HOLIDAY CRUD (CORRIGIDO PARA USAR 'name') ----------
        elif action == "create_holiday":
            unit_id = request.POST.get("unit_id")
            unit = get_object_or_404(Unit, id=unit_id, barbershop=barbershop)
            UnitHoliday.objects.create(
                unit=unit,
                date=request.POST.get("date"),
                name=request.POST.get("name"), # CORRIGIDO de 'description' para 'name'
            )
        elif action == "edit_holiday":
            holiday = get_object_or_404(UnitHoliday, id=request.POST.get("holiday_id"), unit__barbershop=barbershop)
            holiday.date = request.POST.get("date")
            holiday.name = request.POST.get("name") # CORRIGIDO de 'description' para 'name'
            holiday.save()
        elif action == "delete_holiday":
            holiday = get_object_or_404(UnitHoliday, id=request.POST.get("holiday_id"), unit__barbershop=barbershop)
            holiday.delete()

        # ---------- EMPLOYEE ABSENCE CRUD ----------
        elif action == "create_absence":
            emp_ids = request.POST.getlist("employee_id") 
            date_start = request.POST.get("date_start")
            date_end = request.POST.get("date_end")
            reason = request.POST.get("reason", "Folga agendada")

            for emp_id in emp_ids:
                emp = get_object_or_404(Employee, id=emp_id, unit__barbershop=barbershop)
                EmployeeAbsence.objects.create(
                    employee=emp,
                    start_date=date_start,
                    end_date=date_end,
                    reason=reason,
                )
        elif action == "delete_absence":
            absence = get_object_or_404(EmployeeAbsence, id=request.POST.get("absence_id"), employee__unit__barbershop=barbershop)
            absence.delete()

        if unit_slug:
            return redirect("barbershop:workday_unit", barbershop_slug=barbershop.slug, unit_slug=unit_slug)
        else:
            return redirect("barbershop:workday_general", barbershop_slug=barbershop.slug)

    holidays = UnitHoliday.objects.filter(unit__barbershop=barbershop, date__gte=now().date()).order_by("date")
    absences = EmployeeAbsence.objects.filter(employee__unit__barbershop=barbershop, start_date__gte=now().date()).order_by("start_date")
    workdays = EmployeeWorkDay.objects.filter(employee__unit__barbershop=barbershop)

    # ---------- Preparando dados para o JS (CORRIGIDO COM NOMES DE CAMPOS REAIS) ----------
    workdays_data = {}
    workdays_data = {}
    for emp in employees:
        emp_data = {}
        # Garante que todos os dias da semana estejam no dicionário, mesmo que não haja registro
        for i in range(7):
            wd = workdays.filter(employee=emp, weekday=i).first()
            if wd:
                emp_data[i] = {
                    'is_active': wd.is_active,
                    'start_morning_work': wd.start_morning_work.strftime('%H:%M') if wd.start_morning_work else '',
                    'end_morning_work': wd.end_morning_work.strftime('%H:%M') if wd.end_morning_work else '',
                    'start_afternoon_work': wd.start_afternoon_work.strftime('%H:%M') if wd.start_afternoon_work else '',
                    'end_afternoon_work': wd.end_afternoon_work.strftime('%H:%M') if wd.end_afternoon_work else '',
                    # 👇 CAMPOS ADICIONADOS AQUI 👇
                    'morning_available': wd.morning_available,
                    'afternoon_available': wd.afternoon_available
                }
            else:
                # Caso de segurança se o sinal falhar
                emp_data[i] = {
                    'is_active': False,
                    'morning_available': False,
                    'afternoon_available': False,
                    'start_morning_work': '', 'end_morning_work': '',
                    'start_afternoon_work': '', 'end_afternoon_work': ''
                }
        workdays_data[emp.id] = emp_data

    time_options = [f"{h:02d}:{m:02d}" for h in range(24) for m in (0, 30)]
    context = {
        "barbershop": barbershop,
        "units": units,
        "employees": employees,
        "holidays": holidays,
        "absences": absences,
        "workdays": workdays,
        "gerente_unit": gerente_unit,
        "time_options": time_options,
        "workdays_json": json.dumps(workdays_data),
    }
    return render(request, "barbershop/workDay.html", context)