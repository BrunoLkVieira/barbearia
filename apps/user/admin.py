from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User
from .forms import UserCreationForm, UserChangeForm


class UserAdmin(BaseUserAdmin):
    form = UserChangeForm
    add_form = UserCreationForm

    # MUDOU AQUI: Tirei o 'cpf' e coloquei 'email' e 'document'
    list_display = ('email', 'name', 'last_name', 'document', 'phone', 'birth_date', 'user_type', 'is_staff', 'is_superuser')
    list_filter = ('user_type', 'is_staff', 'is_superuser')
    
    fieldsets = (
        ('Acesso', {'fields': ('email', 'password')}),
        # MUDOU AQUI: Adicionei document_type e document
        ('Informações pessoais', {'fields': ('name', 'last_name', 'document_type', 'document', 'phone', 'birth_date', 'profile_picture', 'user_type')}),
        ('Permissões', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Datas Importantes', {'fields': ('last_login',)}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            # MUDOU AQUI: Tirei o 'cpf'
            'fields': ('email', 'name', 'last_name', 'document_type', 'document', 'phone', 'birth_date', 'user_type', 'password1', 'password2'),
        }),
    )
    
    # MUDOU AQUI: Tirei o 'cpf' da pesquisa e ordenação
    search_fields = ('email', 'name', 'last_name', 'document')
    ordering = ('email',) 
    filter_horizontal = ('groups', 'user_permissions')


admin.site.register(User, UserAdmin)