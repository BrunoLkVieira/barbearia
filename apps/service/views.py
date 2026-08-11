import time
from decimal import Decimal, InvalidOperation
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from django.contrib.auth.decorators import login_required

from apps.barbershop.models import Barbershop, Unit, Employee
from apps.scheduling.models import AppointmentService
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
                
                # BLINDAGEM DE SOFTWARE: Impede deleção se existir no Histórico/Agenda
                if AppointmentService.objects.filter(service__in=svcs_to_delete).exists():
                    messages.error(request, "Falha na exclusão: Este serviço possui agendamentos no histórico e não pode ser deletado. Para ocultá-lo, edite e desmarque os barbeiros.")
                else:
                    svcs_to_delete.delete()
                    messages.success(request, "Serviço excluído da grade dos barbeiros selecionados!")

            elif action in ["create", "update"]:
                base_service_id = request.POST.get('base_service') or None
                name = request.POST.get('name')
                price_str = request.POST.get('price', '0').replace('R$', '').replace(',', '.').strip()
                
                # =================================================================
                # BLINDAGEM DE BACKEND: Evita Crash Matemático com Números Gigantes
                # =================================================================
                try:
                    price = Decimal(price_str)
                    if price < Decimal('0.00') or price > Decimal('99999.99'):
                        raise ValueError
                except (InvalidOperation, ValueError, TypeError):
                    messages.error(request, "Bloqueio de Segurança: O preço inserido é inválido ou excede o limite permitido do sistema.")
                    return redirect(f"{request.path}?_={int(time.time())}")
                # =================================================================

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

                    has_warning = False

                    for svc in existing_svcs:
                        if svc.employee_id in new_emp_ids:
                            svc.name = name
                            svc.price = price
                            svc.duration = duration
                            svc.base_service_id = base_service_id
                            svc.save()
                        else:
                            # BLINDAGEM NO UPDATE: Se o dono desmarcar um barbeiro que já tem histórico
                            if AppointmentService.objects.filter(service=svc).exists():
                                has_warning = True
                            else:
                                svc.delete()

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
                    
                    if has_warning:
                        messages.warning(request, "Atenção: Alguns barbeiros não puderam ser removidos deste serviço pois já possuem atendimentos com ele no Histórico. As demais edições foram salvas!")
                    else:
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