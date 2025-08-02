# apps/user/backends.py

from django.contrib.auth.backends import BaseBackend
from django.contrib.auth import get_user_model
from django.db.models import Q

User = get_user_model()

class CPFBackend(BaseBackend):
    """
    Backend de autenticação que permite login com CPF e senha
    """
    
    def authenticate(self, request, cpf=None, password=None, **kwargs):
        if cpf is None or password is None:
            return None
        
        try:
            # Buscar usuário pelo CPF
            user = User.objects.get(cpf=cpf)
            
            # Verificar senha
            if user.check_password(password):
                return user
            
        except User.DoesNotExist:
            # Simular verificação de senha para evitar timing attacks
            User().set_password(password)
            return None
        
        return None
    
    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None

class EmailOrCPFBackend(BaseBackend):
    """
    Backend que permite login com email OU CPF
    """
    
    def authenticate(self, request, username=None, password=None, cpf=None, email=None, **kwargs):
        if password is None:
            return None
        
        # Determinar o campo de busca
        if cpf:
            lookup_field = 'cpf'
            lookup_value = cpf
        elif email:
            lookup_field = 'email'
            lookup_value = email
        elif username:
            # Tentar descobrir se é email ou CPF
            if '@' in username:
                lookup_field = 'email'
                lookup_value = username
            else:
                lookup_field = 'cpf'
                lookup_value = username
        else:
            return None
        
        try:
            # Buscar usuário
            user = User.objects.get(**{lookup_field: lookup_value})
            
            # Verificar senha
            if user.check_password(password):
                return user
                
        except User.DoesNotExist:
            # Simular verificação de senha para evitar timing attacks
            User().set_password(password)
            return None
        
        return None
    
    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None