from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from apps.barbershop.models import Barbershop, Unit, Employee
from .models import BarberService, BaseService

def ServiceView(request, barbershop_slug, unit_slug=None):
    barbershop = get_object_or_404(Barbershop, slug=barbershop_slug)
    unit = get_object_or_404(Unit, slug=unit_slug, barbershop=barbershop) if unit_slug else None

    if request.method == "POST":
        action = request.POST.get('action')
        service_id = request.POST.get('service_id')

        # Dados Comuns para Create e Update
        base_service_id = request.POST.get('base_service')
        name = request.POST.get('name')
        price = request.POST.get('price')
        duration = request.POST.get('duration')
        # Captura a lista de IDs (usada tanto no Create quanto no Update)
        employee_ids = request.POST.getlist('employee_ids')

        # --- AÇÃO: EXCLUIR ---
        if action == "delete":
            service = get_object_or_404(BarberService, id=service_id)
            service.delete()
            messages.success(request, "Serviço excluído com sucesso!")
            return redirect(request.path)

        # --- AÇÃO: CRIAR (Vários de uma vez) ---
        elif action == "create":
            for emp_id in employee_ids:
                BarberService.objects.create(
                    base_service_id=base_service_id,
                    employee_id=emp_id,
                    name=name,
                    price=price,
                    duration=duration
                )
            messages.success(request, f"{len(employee_ids)} serviços criados!")
            return redirect(request.path)

        # --- AÇÃO: EDITAR (ADICIONADO AGORA) ---
        elif action == "update":
            service = get_object_or_404(BarberService, id=service_id)
            
            # Atualiza os campos
            service.base_service_id = base_service_id
            service.name = name
            service.price = price
            service.duration = duration
            
            # Como o seu JS garante que na edição apenas 1 fica marcado:
            if employee_ids:
                service.employee_id = employee_ids[0]
            
            service.save()
            messages.success(request, "Serviço atualizado com sucesso!")
            return redirect(request.path)

    # ... Restante da lógica de listagem (Filtro de unit) permanece igual ...
    if unit:
        employees = Employee.objects.filter(unit=unit)
        services = BarberService.objects.filter(employee__unit=unit)
    else:
        employees = Employee.objects.filter(unit__barbershop=barbershop)
        services = BarberService.objects.filter(employee__unit__barbershop=barbershop)

    context = {
        "barbershop": barbershop,
        "unit": unit,
        "units": barbershop.units.all(),
        "employees": employees,
        "services": services,
        "base_services": BaseService.objects.all(),
        "active_tab": "catalog",
    }
    return render(request, "service/services.html", context)