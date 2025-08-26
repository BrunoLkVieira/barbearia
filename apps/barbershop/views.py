from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from .models import Unit, Barbershop

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
