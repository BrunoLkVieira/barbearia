from django.contrib import admin
from .models import Barbershop, Unit

@admin.register(Barbershop)
class BarbershopAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)
    ordering = ("id",)


@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "barbershop", "is_active")
    search_fields = ("name", "barbershop__name")
    list_filter = ("is_active", "barbershop")
    ordering = ("id",)


from django.contrib import admin
from .models import Employee

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = (
        "id", 
        "user", 
        "unit", 
        "commission_percentage", 
        "service_commission_percentage", 
        "product_commission_percentage", 
        "can_manage_cashbox",
        "can_register_sell",
        "can_create_appointments",
        "system_access",
    )
    list_filter = ("unit", "commission_percentage", "system_access")
    search_fields = ("user__username", "user__first_name", "user__last_name", "unit__name")
    ordering = ("unit", "user")
    autocomplete_fields = ("user", "unit")  # facilita quando tiver muitos usuários/unidades
