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
