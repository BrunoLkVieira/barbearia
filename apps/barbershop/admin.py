from django.contrib import admin
from .models import Barbershop, Unit, Employee, UnitWorkDay, EmployeeWorkDay, EmployeeAbsence, UnitHoliday, Role, UnitMedia

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





@admin.register(UnitWorkDay)
class UnitWorkDayAdmin(admin.ModelAdmin):
    list_display = ("unit", "weekday", "open_time", "close_time", "is_open")
    list_filter = ("unit", "weekday", "is_open")
    search_fields = ("unit__name",)
    ordering = ("unit", "weekday")


@admin.register(EmployeeWorkDay)
class EmployeeWorkDayAdmin(admin.ModelAdmin):
    list_display = (
        "employee",
        "weekday",
        "start_morning_work",
        "end_morning_work",
        "start_afternoon_work",
        "end_afternoon_work",
        "morning_available",
        "afternoon_available",
        "is_active",
    )
    list_filter = ("employee", "weekday", "is_active")
    search_fields = ("employee__name",)
    ordering = ("employee", "weekday")


@admin.register(EmployeeAbsence)
class EmployeeAbsenceAdmin(admin.ModelAdmin):
    list_display = ("employee", "start_date", "end_date", "reason")
    list_filter = ("employee", "start_date", "end_date")
    search_fields = ("employee__name", "reason")
    ordering = ("-start_date",)


@admin.register(UnitHoliday)
class UnitHolidayAdmin(admin.ModelAdmin):
    list_display = ("unit", "name", "date")
    list_filter = ("unit", "date")
    search_fields = ("unit__name", "name")
    ordering = ("unit", "date")






@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("employee", "occupation")
    list_filter = ("occupation",)
    search_fields = ("employee__name",)
    ordering = ("employee", "occupation")



@admin.register(UnitMedia)
class UnitMediaAdmin(admin.ModelAdmin):
    list_display = ("unit", "media_type", "order", "created_at", "image_preview")
    list_filter = ("media_type", "unit")
    search_fields = ("unit__name",)
    ordering = ("unit", "order")

    def image_preview(self, obj):
        if obj.image:
            return f"🖼️ {obj.image.url}"
        return "Sem imagem"
    image_preview.short_description = "Preview"