from django.db import models
from django.conf import settings
from apps.barbershop.models import Barbershop

class Client(models.Model):
    # O link com User é opcional (null=True) para permitir o "cliente de balcão"
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='client_profile')
    barbershop = models.ForeignKey(Barbershop, on_delete=models.CASCADE, related_name='clients')
    
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20)
    cpf = models.CharField(max_length=14, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.barbershop.name}"