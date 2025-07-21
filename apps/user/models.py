from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from .utils.validators import validate_cpf

class User(AbstractUser):
    # Informações básicas
    email = models.EmailField(unique=True)
    cpf = models.CharField(max_length=14, unique=True, validators=[validate_cpf])
    phone = models.CharField(max_length=15, blank=True, null=True)
    birth_date = models.DateField(null=True, blank=True)
    photo = models.ImageField(upload_to='users/photos/', null=True, blank=True)
    
    # Status de verificação
    email_verified = models.BooleanField(default=False)
    verification_token = models.CharField(max_length=100, blank=True, null=True)
    verification_sent_at = models.DateTimeField(null=True, blank=True)
    
    # Controle de segurança
    failed_login_attempts = models.PositiveIntegerField(default=0)
    last_failed_login = models.DateTimeField(null=True, blank=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    
    # Permissões
    is_barber = models.BooleanField(default=False)
    is_customer = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        return self.get_full_name() or self.username