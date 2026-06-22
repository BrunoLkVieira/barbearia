from django.db import models
from django.conf import settings
from apps.barbershop.models import Barbershop

class Client(models.Model):
    # CORREÇÃO CRÍTICA: ForeignKey permite que o mesmo User seja cliente em várias barbearias
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='client_profiles'
    )
    barbershop = models.ForeignKey(Barbershop, on_delete=models.CASCADE, related_name='clients')
    
    # MANTENHA ESTES CAMPOS: São essenciais para "Clientes de Balcão" que não possuem cadastro 'User' na plataforma
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20)
    cpf = models.CharField(max_length=14, blank=True, null=True)
    
    # NOVO: Trava Anti-Spam
    is_blocked = models.BooleanField("Bloqueado", default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Garante que um User só tenha 1 perfil de Cliente POR barbearia
        unique_together = ('user', 'barbershop')

    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.barbershop.name}"