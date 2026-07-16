from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from django.core.paginator import Paginator
from django.db.models import Q, Count, Max
from django.contrib.auth.decorators import login_required

from apps.barbershop.models import Barbershop, Employee, Unit
from apps.scheduling.models import Appointment # IMPORTANTE: Nova importação aqui!
from .models import Client

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
def ClientListView(request, barbershop_slug):
    barbershop = get_object_or_404(Barbershop, slug=barbershop_slug)
    
    is_owner = (request.user == barbershop.owner_user)
    emp = get_tenant_employee(request.user, barbershop)
    is_manager = emp.roles.filter(occupation__iexact='gerente').exists() if emp else False

    units = Unit.objects.filter(barbershop=barbershop, is_active=True)
    unit_slug = request.GET.get('unit', 'geral')
    
    if is_owner:
        current_unit = units.filter(slug=unit_slug).first() if unit_slug != 'geral' else None
    else:
        current_unit = emp.unit if emp else None
        units = [current_unit] if current_unit else []

    if request.method == "POST":
        action = request.POST.get('action')
        client_id = request.POST.get('client_id')
        
        first_name = request.POST.get('first_name', '').strip()
        last_name = request.POST.get('last_name', '').strip()
        phone = request.POST.get('phone', '').strip()
        email = request.POST.get('email', '').strip()
        birth_date_str = request.POST.get('birth_date') or None
        is_blocked = request.POST.get('is_blocked') == 'true'
        
        post_unit_id = request.POST.get('unit_id')
        target_unit = Unit.objects.filter(id=post_unit_id, barbershop=barbershop).first() if post_unit_id else current_unit

        try:
            if action == "create":
                Client.objects.create(
                    barbershop=barbershop,
                    unit=target_unit,
                    first_name=first_name,
                    last_name=last_name,
                    phone=phone,
                    email=email,
                    birth_date=birth_date_str,
                    is_blocked=is_blocked
                )
                messages.success(request, f"Cliente {first_name} cadastrado na unidade com sucesso!")

            elif action == "update":
                client = get_object_or_404(Client, id=client_id, barbershop=barbershop)
                client.first_name = first_name
                client.last_name = last_name
                client.phone = phone
                client.email = email
                client.birth_date = birth_date_str
                client.is_blocked = is_blocked
                if target_unit:
                    client.unit = target_unit
                client.save()
                messages.success(request, "Dados do cliente atualizados!")

            elif action == "delete":
                if not is_owner and not is_manager:
                    messages.error(request, "Acesso Negado: Apenas Titular ou Gerente podem excluir clientes.")
                else:
                    client = get_object_or_404(Client, id=client_id, barbershop=barbershop)
                    client.delete()
                    messages.success(request, "Cliente removido da base de dados.")

        except Exception as e:
            messages.error(request, f"Erro na operação: {str(e)}")
        
        return redirect(request.path)

    search_query = request.GET.get('search', '').strip()
    sort_filter = request.GET.get('sort', '-created_at')
    status_filter = request.GET.get('status', 'all')

    all_clients = Client.objects.filter(barbershop=barbershop)

    # NOVO FILTRO BLINDADO (Subquery)
    if current_unit:
        # 1. Pega os IDs de quem já agendou nessa unidade
        clients_with_appointments = Appointment.objects.filter(
            unit=current_unit, barbershop=barbershop
        ).values_list('client_id', flat=True)

        # 2. Mostra se o cliente é da unidade, se é legado, ou se está na lista acima
        all_clients = all_clients.filter(
            Q(unit=current_unit) | 
            Q(unit__isnull=True) | 
            Q(id__in=clients_with_appointments)
        ).distinct()

    if search_query:
        search_terms = search_query.split()
        for term in search_terms:
            all_clients = all_clients.filter(
                Q(first_name__icontains=term) | 
                Q(last_name__icontains=term) | 
                Q(phone__icontains=term)
            )

    if status_filter == 'active':
        all_clients = all_clients.filter(is_blocked=False)
    elif status_filter == 'blocked':
        all_clients = all_clients.filter(is_blocked=True)

    all_clients = all_clients.annotate(
        completed_visits=Count('appointments', filter=Q(appointments__status='completed')),
        last_visit_date=Max('appointments__date', filter=Q(appointments__status='completed'))
    ).order_by(sort_filter)
    
    total_geral = all_clients.count()

    paginator = Paginator(all_clients, 10)
    page_number = request.GET.get('page')
    clients_page = paginator.get_page(page_number)

    context = {
        'barbershop': barbershop,
        'clients': clients_page,
        'search_query': search_query,
        'sort_filter': sort_filter,
        'status_filter': status_filter,
        'active_tab': 'clients',
        'total_geral': total_geral,
        'is_owner': is_owner,
        'is_manager': is_manager,
        'units': units,
        'current_unit': current_unit
    }
    
    return render(request, 'client/clientes.html', context)