from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from .models import Unit, Barbershop


def dono_required(view_func):
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated or getattr(request.user, "user_type", None) != "dono":
            messages.error(request, "Acesso negado. Apenas donos podem acessar.")
            return redirect("login")  # ou uma página de erro
        return view_func(request, *args, **kwargs)
    return wrapper


@login_required
@dono_required
def UnitView(request):
    barbershop = Barbershop.objects.filter(owner_user=request.user).first()
    units = Unit.objects.filter(barbershop=barbershop)

    # Criar unidade
    if request.method == "POST" and "create_unit" in request.POST:
        Unit.objects.create(
            name=request.POST.get("name"),
            cep_address=request.POST.get("cep_address"),
            street_address=request.POST.get("street_address"),
            number_address=request.POST.get("number_address"),
            is_active=bool(request.POST.get("is_active")),
            barbershop=barbershop,
        )
        return redirect("barbershop/unit.html")

    # Editar unidade
    if request.method == "POST" and "edit_unit" in request.POST:
        unit = get_object_or_404(Unit, pk=request.POST.get("unit_id"), barbershop=barbershop)
        unit.name = request.POST.get("name")
        unit.cep_address = request.POST.get("cep_address")
        unit.street_address = request.POST.get("street_address")
        unit.number_address = request.POST.get("number_address")
        unit.is_active = bool(request.POST.get("is_active"))
        unit.save()
        return redirect("unit-page")

    # Deletar unidade
    if request.method == "POST" and "delete_unit" in request.POST:
        unit = get_object_or_404(Unit, pk=request.POST.get("unit_id"), barbershop=barbershop)
        unit.delete()
        return redirect("barbershop/unit.html")

    return render(request, "barbershop/unit.html", {"units": units, "user": request.user})
