import json
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from django.core.paginator import Paginator
from django.db.models import Q, Count, Max
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.db import transaction
from django.contrib.auth import authenticate, login, logout

from apps.barbershop.models import Barbershop, Employee, Unit
from apps.scheduling.models import Appointment
from apps.user.models import User
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

    if current_unit:
        clients_with_appointments = Appointment.objects.filter(
            unit=current_unit, barbershop=barbershop
        ).values_list('client_id', flat=True)

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


# ===================================================================
# APIS DA LANDING PAGE (LOGIN / REGISTRO / LOGOUT)
# ===================================================================
def api_register_client(request, barbershop_slug):
    try:
        data = json.loads(request.body)
        
        email = data.get('email', '').strip().lower()
        password = data.get('password')
        name = data.get('name', '').strip()
        last_name = data.get('last_name', '').strip() # CAPTURA O SOBRENOME
        phone = data.get('phone', '').strip()
        birth_date = data.get('birth_date')
        
        # Blindagem: Converte string vazia para None para não dar erro no banco
        if not birth_date:
            birth_date = None

        # TRAVA DE SEGURANÇA: Se não vier sobrenome, barra a criação!
        if not email or not password or not name or not last_name:
            return JsonResponse({'status': 'error', 'message': 'Por favor, preencha Nome, Sobrenome, E-mail e Senha.'}, status=400)

        barbershop = get_object_or_404(Barbershop, slug=barbershop_slug)

        if User.objects.filter(email=email).exists():
            return JsonResponse({'status': 'error', 'message': 'Este e-mail já está cadastrado em nosso sistema.'}, status=400)

        with transaction.atomic():
            # 1. Cria o Usuário Global
            user = User.objects.create_user(
                email=email,
                password=password,
                name=name,
                last_name=last_name,
                phone=phone,
                birth_date=birth_date,
                user_type='cliente'
            )
            
            # 2. Cria o Perfil de Cliente isolado na Barbearia
            Client.objects.create(
                user=user,
                barbershop=barbershop,
                first_name=name,
                last_name=last_name,
                email=email,
                phone=phone,
                birth_date=birth_date
            )

        # Autentica e loga automaticamente
        user_auth = authenticate(request, username=email, password=password)
        if user_auth:
            login(request, user_auth)

        return JsonResponse({'status': 'success', 'message': 'Conta criada com sucesso!'})

    except Exception as e:
        return JsonResponse({'status': 'error', 'message': f'Erro interno: {str(e)}'}, status=500)



@require_POST
def api_login_client(request, barbershop_slug):
    try:
        data = json.loads(request.body)
        email = data.get('email', '').strip().lower()
        password = data.get('password')

        user_auth = authenticate(request, username=email, password=password)
        if user_auth:
            login(request, user_auth)
            return JsonResponse({'status': 'success', 'message': 'Login efetuado com sucesso!'})
        else:
            return JsonResponse({'status': 'error', 'message': 'E-mail ou senha incorretos.'}, status=401)
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': f'Erro interno: {str(e)}'}, status=500)


@require_POST
def api_logout_client(request, barbershop_slug):
    logout(request)
    return JsonResponse({'status': 'success', 'message': 'Logout efetuado.'})