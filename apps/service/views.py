from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from apps.barbershop.models import Barbershop, Unit, Employee
from .models import BarberService, BaseService

def ServiceView(request, barbershop_slug, unit_slug=None):
    barbershop = get_object_or_404(Barbershop, slug=barbershop_slug)
    unit = get_object_or_404(Unit, slug=unit_slug, barbershop=barbershop) if unit_slug else None

    if request.method == "POST":
        # Captura os dados do POST
        base_service_id = request.POST.get('base_service')
        employee_id = request.POST.get('employee') # Novo campo
        name = request.POST.get('name')
        price = request.POST.get('price')
        duration = request.POST.get('duration')

        # Criação do serviço vinculando ao funcionário selecionado
        BarberService.objects.create(
            base_service_id=base_service_id,
            employee_id=employee_id, # Vinculo corrigido
            name=name,
            price=price,
            duration=duration
        )
        messages.success(request, "Serviço criado com sucesso!")
        return redirect(request.path)

    # Lógica de Filtro para a Listagem e para o Modal
    if unit:
        # Se houver unidade, filtra funcionários e serviços apenas dela
        employees = Employee.objects.filter(unit=unit)
        services = BarberService.objects.filter(employee__unit=unit)
    else:
        # Geral: Todos os funcionários e serviços da barbearia
        employees = Employee.objects.filter(unit__barbershop=barbershop)
        services = BarberService.objects.filter(employee__unit__barbershop=barbershop)

    context = {
        "barbershop": barbershop,
        "unit": unit,
        "units": barbershop.units.all(),
        "employees": employees, # Enviado para popular o select do modal
        "services": services,
        "base_services": BaseService.objects.all(),
    }
    return render(request, "service/services.html", context)