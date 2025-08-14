from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User
from .forms import UserCreationForm, UserChangeForm


class UserAdmin(BaseUserAdmin):
    form = UserChangeForm
    add_form = UserCreationForm

    list_display = ('cpf', 'email', 'nome', 'tipo_usuario', 'is_staff', 'is_superuser')
    list_filter = ('tipo_usuario', 'is_staff', 'is_superuser')
    fieldsets = (
        (None, {'fields': ('cpf', 'password')}),
        ('Informações pessoais', {'fields': ('email', 'nome', 'tipo_usuario')}),
        ('Permissões', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('cpf', 'email', 'nome', 'tipo_usuario', 'password1', 'password2'),
        }),
    )
    search_fields = ('cpf', 'email', 'nome')
    ordering = ('cpf',)
    filter_horizontal = ('groups', 'user_permissions')


admin.site.register(User, UserAdmin)
