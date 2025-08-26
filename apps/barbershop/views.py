from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from .models import Unit, Barbershop, Employee

def dono_required(view_func):
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated or getattr(request.user, "user_type", None) != "dono":
            messages.error(request, "Acesso negado. Apenas donos podem acessar.")
            return redirect("login")
        return view_func(request, *args, **kwargs)
    return wrapper


@login_required
@dono_required
def UnitView(request, barbershop_slug):
    # Só busca barbearia do usuário logado
    barbershop = get_object_or_404(Barbershop, slug=barbershop_slug, owner_user=request.user)

    units = Unit.objects.filter(barbershop=barbershop)
    active_units_count = units.filter(is_active=True).count()

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
        },
    )

@login_required
@dono_required
def EmployeeView(request, barbershop_slug):
    # pega barbearia do dono logado
    barbershop = get_object_or_404(
        Barbershop, slug=barbershop_slug, owner_user=request.user
    )

    # pega todas as unidades dessa barbearia
    units = barbershop.units.all()

    # lista de funcionários (só das unidades da barbearia)
    employees = Employee.objects.filter(unit__barbershop=barbershop)

    if request.method == "POST":
        action = request.POST.get("action")

        # criar funcionário
        if action == "create":
            user = User.objects.create_user(
                username=request.POST.get("email"),  # ou pode ser outro identificador
                email=request.POST.get("email"),
                password=request.POST.get("password"),
                first_name=request.POST.get("name")
            )
            Employee.objects.create(
                user=user,
                unit=Unit.objects.get(id=request.POST.get("unit_id")),
                system_access=True if request.POST.get("system_access") == "on" else False
            )

        # editar funcionário
        elif action == "edit":
            emp = get_object_or_404(Employee, id=request.POST.get("employee_id"), unit__barbershop=barbershop)
            emp.unit_id = request.POST.get("unit_id")
            emp.system_access = True if request.POST.get("system_access") == "on" else False
            emp.save()

        # deletar funcionário
        elif action == "delete":
            emp = get_object_or_404(Employee, id=request.POST.get("employee_id"), unit__barbershop=barbershop)
            emp.delete()

        return redirect("employee", barbershop_slug=barbershop.slug)

    context = {
        "barbershop": barbershop,
        "units": units,
        "employees": employees,
    }
    return render(request, "barbershop/employee.html", context)