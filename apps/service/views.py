import time
from decimal import Decimal
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db.models import ProtectedError # IMPORTAÇÃO CRÍTICA AQUI

from apps.barbershop.models import Barbershop, Unit, Employee
from .models import BarberService, BaseService

def get_tenant_employee(user, barbershop):
    if user.is_authenticated:
        return Employee.objects.filter(user=user, unit__barbershop=barbershop, is_active=True).first()
    return None

def owner_or_employee_required(view_func):
    def wrapper(request, barbershop_slug, *args, **kwargs):
        if not request.user.is_authenticated:
            messages.error(request, "Faça login para acessar.")
            return redirect("user:login")
            
        barbershop = get_object_or_404(Barbershop, slug=barbershop_slug)
        if request.user == barbershop.owner_user:
            return view_func(request, barbershop_slug, *args, **kwargs)
            
        emp = get_tenant_employee(request.user, barbershop)
        if not emp or not emp.system_access:
            messages.error(request, "Você não tem acesso a este painel.")
            return redirect("/") 
            
        return view_func(request, barbershop_slug, *args, **kwargs)
    return wrapper

@login_required
@owner_or_employee_required
def ServiceView(request, barbershop_slug, unit_slug=None):
    barbershop = get_object_or_404(Barbershop, slug=barbershop_slug)
    
    is_owner = (request.user == barbershop.owner_user)
    emp = get_tenant_employee(request.user, barbershop)
    
    is_manager = False
    is_cashier = False
    is_barber = False
    current_unit = None
    
    if emp:
        is_manager = emp.roles.filter(occupation__iexact='gerente').exists()
        is_cashier = emp.roles.filter(occupation__iexact='caixa').exists() and not is_manager
        is_barber = emp.roles.filter(occupation__iexact='barbeiro').exists()

    if is_owner:
        if unit_slug:
            current_unit = get_object_or_404(Unit, slug=unit_slug, barbershop=barbershop)
        units = Unit.objects.filter(barbershop=barbershop, is_active=True)
    else:
        current_unit = emp.unit
        units = [current_unit]

    if request.method == "POST":
        if not is_owner and not is_manager:
            messages.error(request, "Acesso Negado: Apenas proprietários e gerentes podem alterar o catálogo.")
            return redirect(f"{request.path}?_={int(time.time())}")

        action = request.POST.get('action')

        try:
            if action == "delete":
                group_ids = request.POST.get('service_ids', '').split(',')
                svcs_to_delete = BarberService.objects.filter(id__in=[i for i in group_ids if i], employee__unit__barbershop=barbershop)
                if is_manager and not is_owner:
                    svcs_to_delete = svcs_to_delete.filter(employee__unit=current_unit)
                
                # TRATAMENTO DE INTEGRIDADE RELACIONAL (PROTECTED ERROR)
                try:
                    svcs_to_delete.delete()
                    messages.success(request, "Serviço excluído da grade dos barbeiros selecionados!")
                except ProtectedError:
                    messages.error(request, "Falha na exclusão: Este serviço possui agendamentos no histórico. Para ocultá-lo, edite-o e desmarque os barbeiros.")

            elif action in ["create", "update"]:
                base_service_id = request.POST.get('base_service') or None
                name = request.POST.get('name')
                price_str = request.POST.get('price', '0').replace('R$', '').replace(',', '.').strip()
                price = Decimal(price_str)
                duration = int(request.POST.get('duration', 30))
                employee_ids = request.POST.getlist('employee_ids')

                if not employee_ids:
                    messages.error(request, "Erro Crítico: Você precisa selecionar pelo menos um barbeiro responsável pelo serviço.")
                    return redirect(f"{request.path}?_={int(time.time())}")

                if action == "create":
                    for emp_id in employee_ids:
                        target_emp = get_object_or_404(Employee, id=emp_id, unit__barbershop=barbershop)
                        if is_manager and not is_owner and target_emp.unit != current_unit:
                            continue
                        
                        BarberService.objects.create(
                            base_service_id=base_service_id,
                            employee=target_emp,
                            name=name,
                            price=price,
                            duration=duration
                        )
                    messages.success(request, "Serviços adicionados ao catálogo com sucesso!")

                elif action == "update":
                    group_ids = request.POST.get('service_ids', '').split(',')
                    valid_ids = [i for i in group_ids if i]
                    
                    existing_svcs = BarberService.objects.filter(id__in=valid_ids, employee__unit__barbershop=barbershop)
                    if is_manager and not is_owner:
                        existing_svcs = existing_svcs.filter(employee__unit=current_unit)
                        
                    existing_emp_ids = set(existing_svcs.values_list('employee_id', flat=True))
                    new_emp_ids = set(map(int, employee_ids))

                    # TRATAMENTO DE INTEGRIDADE NO UPDATE
                    try:
                        for svc in existing_svcs:
                            if svc.employee_id in new_emp_ids:
                                svc.name = name
                                svc.price = price
                                svc.duration = duration
                                svc.base_service_id = base_service_id
                                svc.save()
                            else:
                                svc.delete()
                    except ProtectedError:
                        messages.warning(request, "Atenção: Não foi possível remover um barbeiro do serviço pois ele possui agendamentos atrelados. As demais alterações foram salvas.")

                    for emp_id in (new_emp_ids - existing_emp_ids):
                        target_emp = get_object_or_404(Employee, id=emp_id, unit__barbershop=barbershop)
                        if is_manager and not is_owner and target_emp.unit != current_unit:
                            continue
                        BarberService.objects.create(
                            base_service_id=base_service_id,
                            employee=target_emp,
                            name=name,
                            price=price,
                            duration=duration
                        )
                    messages.success(request, "Catálogo atualizado e sincronizado com sucesso!")

        except Exception as e:
            messages.error(request, f"Ocorreu um erro no processamento: {str(e)}")

        return redirect(f"{request.path}?_={int(time.time())}")

    raw_services = BarberService.objects.filter(employee__unit__barbershop=barbershop)
    if current_unit:
        raw_services = raw_services.filter(employee__unit=current_unit)
        
    if is_barber and not is_owner and not is_manager:
        raw_services = raw_services.filter(employee=emp)

    raw_services = raw_services.select_related('employee__user', 'employee__unit', 'base_service')

    grouped_services = {}
    for svc in raw_services:
        key = (
            svc.employee.unit.id, 
            svc.base_service.id if svc.base_service else None, 
            svc.name.lower().strip(), 
            svc.price, 
            svc.duration
        )
        if key not in grouped_services:
            grouped_services[key] = {
                'ids': [],
                'unit_id': svc.employee.unit.id,
                'unit_name': svc.employee.unit.name,
                'base_service_id': svc.base_service.id if svc.base_service else '',
                'base_service_icon': svc.base_service.icon if svc.base_service else 'fas fa-cut',
                'name': svc.name,
                'price': svc.price,
                'duration': svc.duration,
                'employee_ids': [],
                'employee_names': [],
            }
        grouped_services[key]['ids'].append(str(svc.id))
        grouped_services[key]['employee_ids'].append(str(svc.employee.id))
        grouped_services[key]['employee_names'].append(svc.employee.user.name)

    services_list = list(grouped_services.values())
    services_list.sort(key=lambda x: (x['unit_name'], x['name']))

    if is_owner and not current_unit:
        modal_employees = Employee.objects.filter(unit__barbershop=barbershop, roles__occupation__iexact='barbeiro', is_active=True).select_related('user', 'unit')
    else:
        modal_employees = Employee.objects.filter(unit=current_unit, roles__occupation__iexact='barbeiro', is_active=True).select_related('user', 'unit')

    context = {
        "barbershop": barbershop,
        "units": units,
        "current_unit": current_unit,
        "services_list": services_list,
        "modal_employees": modal_employees,
        "base_services": BaseService.objects.all(),
        "active_tab": "catalog",
        "is_owner": is_owner,
        "is_manager": is_manager,
        "is_barber": is_barber,
        "is_cashier": is_cashier,
    }
    return render(request, "service/services.html", context)