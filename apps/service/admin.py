# apps/service/admin.py
from django.contrib import admin
from .models import BaseService, BarberService

@admin.register(BaseService)
class BaseServiceAdmin(admin.ModelAdmin):
    # Removi category e is_active para parar o erro
    list_display = ('name',) 
    search_fields = ('name',)
    ordering = ('name',)

@admin.register(BarberService)
class BarberServiceAdmin(admin.ModelAdmin):
    # Aqui mantive os campos que costumam compor o serviço da barbearia
    list_display = ('name', 'base_service', 'price', 'duration')
    list_filter = ('base_service',)
    search_fields = ('name',)