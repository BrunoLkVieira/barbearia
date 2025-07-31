# apps/barbershop/admin.py

from django.contrib import admin
from .models import (
    Barbershop, BarbershopImage, Unit, UnitWorkDay, 
    Employee, EmployeeWorkDay, EmployeeAbsence, Client
)

class BarbershopImageInline(admin.TabularInline):
    model = BarbershopImage
    extra = 1
    fields = ['image', 'title', 'order', 'is_banner', 'active']

class UnitInline(admin.TabularInline):
    model = Unit
    extra = 1
    fields = ['name', 'address', 'is_active']

@admin.register(Barbershop)
class BarbershopAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'owner_user', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'owner_user__first_name', 'owner_user__last_name']
    prepopulated_fields = {'slug': ('name',)}
    
    inlines = [BarbershopImageInline, UnitInline]
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('name', 'slug', 'owner_user', 'logo', 'about')
        }),
        ('Redes Sociais', {
            'fields': ('instagram', 'whatsapp', 'facebook'),
            'classes': ('collapse',)
        }),
        ('Controle', {
            'fields': ('is_active',),
        }),
    )

class UnitWorkDayInline(admin.TabularInline):
    model = UnitWorkDay
    extra = 0
    fields = ['day_of_week', 'start_time', 'end_time', 'is_closed']

@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ['name', 'barbershop', 'address', 'is_active']
    list_filter = ['barbershop', 'is_active']
    search_fields = ['name', 'barbershop__name']
    
    inlines = [UnitWorkDayInline]

@admin.register(UnitWorkDay)
class UnitWorkDayAdmin(admin.ModelAdmin):
    list_display = ['unit', 'get_day_name', 'start_time', 'end_time', 'is_closed']
    list_filter = ['day_of_week', 'is_closed']
    
    def get_day_name(self, obj):
        return obj.get_day_of_week_display()
    get_day_name.short_description = 'Dia da Semana'

class EmployeeWorkDayInline(admin.TabularInline):
    model = EmployeeWorkDay
    extra = 0
    fields = ['day_of_week', 'start_time', 'end_time', 'is_working']

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ['user', 'unit', 'role', 'commission_service', 'commission_product', 'is_active']
    list_filter = ['role', 'unit__barbershop', 'is_active', 'uses_pot']
    search_fields = ['user__first_name', 'user__last_name', 'user__cpf']
    
    inlines = [EmployeeWorkDayInline]
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('user', 'unit', 'role')
        }),
        ('Comissões', {
            'fields': ('commission_service', 'commission_product', 'uses_pot'),
        }),
        ('Controle', {
            'fields': ('is_active',),
        }),
    )

@admin.register(EmployeeWorkDay)
class EmployeeWorkDayAdmin(admin.ModelAdmin):
    list_display = ['employee', 'get_day_name', 'start_time', 'end_time', 'is_working']
    list_filter = ['day_of_week', 'is_working']
    
    def get_day_name(self, obj):
        return obj.get_day_of_week_display()
    get_day_name.short_description = 'Dia da Semana'

@admin.register(EmployeeAbsence)
class EmployeeAbsenceAdmin(admin.ModelAdmin):
    list_display = ['employee', 'date', 'absence_type', 'end_date', 'created_by']
    list_filter = ['absence_type', 'date', 'employee__unit__barbershop']
    search_fields = ['employee__user__first_name', 'employee__user__last_name', 'reason']
    date_hierarchy = 'date'

@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ['user', 'barbershop', 'preferred_barber', 'first_visit', 'last_visit', 'is_active']
    list_filter = ['barbershop', 'is_active', 'first_visit']
    search_fields = ['user__first_name', 'user__last_name', 'user__cpf']
    date_hierarchy = 'first_visit'

@admin.register(BarbershopImage)
class BarbershopImageAdmin(admin.ModelAdmin):
    list_display = ['barbershop', 'title', 'order', 'is_banner', 'active']
    list_filter = ['barbershop', 'is_banner', 'active']
    search_fields = ['barbershop__name', 'title']