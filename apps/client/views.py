from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from django.core.paginator import Paginator
from django.db.models import Q
from apps.barbershop.models import Barbershop, Unit
from .models import Client

def ClientListView(request, barbershop_slug):
    barbershop = get_object_or_404(Barbershop, slug=barbershop_slug)
    units = Unit.objects.filter(barbershop=barbershop)
    
    # 1. Processar POST (Criar, Editar, Deletar)
    if request.method == "POST":
        action = request.POST.get('action')
        client_id = request.POST.get('client_id')
        
        # Dados do formulário
        first_name = request.POST.get('first_name')
        last_name = request.POST.get('last_name')
        phone = request.POST.get('phone')
        email = request.POST.get('email')

        try:
            if action == "create":
                Client.objects.create(
                    barbershop=barbershop,
                    first_name=first_name,
                    last_name=last_name,
                    phone=phone,
                    email=email
                )
                messages.success(request, f"Cliente {first_name} cadastrado!")

            elif action == "update":
                client = get_object_or_404(Client, id=client_id, barbershop=barbershop)
                client.first_name, client.last_name = first_name, last_name
                client.phone, client.email = phone, email
                client.save()
                messages.success(request, "Dados atualizados!")

            elif action == "delete":
                client = get_object_or_404(Client, id=client_id, barbershop=barbershop)
                client.delete()
                messages.success(request, "Cliente removido.")

        except Exception as e:
            messages.error(request, f"Erro: {str(e)}")
        
        return redirect(request.path)

    # 2. Lógica de Listagem e Ordenação (GET)
    search_query = request.GET.get('search', '')
    sort_filter = request.GET.get('sort', '-created_at')

    # Busca básica apenas na barbearia atual
    all_clients = Client.objects.filter(barbershop=barbershop)

    total_geral = all_clients.count()

    # Aplica filtros de busca (se houver)
    if search_query:
        all_clients = all_clients.filter(
            Q(first_name__icontains=search_query) | 
            Q(phone__icontains=search_query)
        )

    # Aplica a ordenação vinda do HTML (trata 'first_name', '-first_name' ou '-created_at')
    all_clients = all_clients.order_by(sort_filter)

    # 3. Paginação (10 por página)
    paginator = Paginator(all_clients, 10)
    page_number = request.GET.get('page')
    clients_page = paginator.get_page(page_number)

    context = {
        'barbershop': barbershop,
        'clients': clients_page,
        'units': units,
        'search_query': search_query,
        'sort_filter': sort_filter,
        'active_tab': 'clients',
        'total_geral': total_geral,
    }
    
    return render(request, 'client/clientes.html', context)