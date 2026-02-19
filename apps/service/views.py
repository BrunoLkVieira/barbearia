from django.shortcuts import render, get_object_or_404
from apps.barbershop.models import Barbershop, Unit, Employee
from .models import BarberService, BaseService

def ServiceView(request, barbershop_slug, unit_slug=None):
    barbershop = get_object_or_404(Barbershop, slug=barbershop_slug)
    
    # Lógica de Unidade (Mesma das outras telas)

    unit = get_object_or_404(Unit, slug=unit_slug, barbershop=barbershop) if unit_slug else None
    
    # Filtra funcionários para o select do CRUD
    if unit:
        employees = Employee.objects.filter(unit=unit)
        services = BarberService.objects.filter(employee__unit=unit)
    else:
        employees = Employee.objects.filter(unit__barbershop=barbershop)
        services = BarberService.objects.filter(employee__unit__barbershop=barbershop)

    # Dados base para os modais de criação/edição
    base_services = BaseService.objects.all()
    units = barbershop.units.all()

    context = {
        "barbershop": barbershop,
        "unit": unit,
        "units": units,
        "employees": employees,
        "services": services,
        "base_services": base_services,
        "active_menu": "catalog",
    }
    return render(request, "service/services.html", context)