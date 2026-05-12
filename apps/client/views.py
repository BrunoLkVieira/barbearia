from django.shortcuts import render, get_object_or_404
from apps.barbershop.models import Barbershop, Unit
from .models import Client



def ClientListView(request, barbershop_slug):
    # 1. Busca a barbearia pelo slug da URL
    barbershop = get_object_or_404(Barbershop, slug=barbershop_slug)
    
    # 2. Busca todos os clientes dessa barbearia
    clients = Client.objects.filter(barbershop=barbershop).order_by('-created_at')
    
    # 3. Busca as unidades para o filtro do topo
    units = Unit.objects.filter(barbershop=barbershop)
    
    # 4. Prepara o "pacote" de dados (contexto) para o HTML
    context = {
        'barbershop': barbershop,
        'clients': clients,
        'units': units,
        'active_tab': 'clients', # Para o menu saber que esta aba é a ativa
    }
    
    return render(request, 'client/clientes.html', context)