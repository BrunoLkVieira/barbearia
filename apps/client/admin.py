from django.contrib import admin
from .models import Client

@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    # O que aparece na listagem
    list_display = ('first_name', 'last_name', 'phone', 'barbershop', 'user')
    
    # Campos que permitem clicar para entrar no detalhe
    list_display_links = ('first_name', 'last_name')
    
    # Barra de busca (ajuda muito quando tiver 500 clientes)
    search_fields = ('first_name', 'last_name', 'email', 'phone', 'cpf')
    
    # Filtro lateral
    list_filter = ('barbershop', 'created_at')
    
    # Quantidade por página
    list_per_page = 20