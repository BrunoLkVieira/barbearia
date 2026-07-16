from datetime import date
from django.db import models
from django.conf import settings
from apps.barbershop.models import Barbershop, Unit

class Client(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='client_profiles'
    )
    barbershop = models.ForeignKey(Barbershop, on_delete=models.CASCADE, related_name='clients')
    unit = models.ForeignKey(Unit, on_delete=models.SET_NULL, null=True, blank=True, related_name='clients')
    
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20)
    
    birth_date = models.DateField(null=True, blank=True)
    is_blocked = models.BooleanField("Bloqueado", default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'barbershop')

    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.barbershop.name}"

    @property
    def age(self):
        b_date = self.birth_date or (self.user.birth_date if self.user else None)
        if b_date:
            # Trava de segurança: Se o banco de dados devolver uma string, converte para data
            if isinstance(b_date, str):
                from datetime import datetime
                try:
                    b_date = datetime.strptime(b_date, '%Y-%m-%d').date()
                except ValueError:
                    return None
            
            today = date.today()
            # Calcula a idade reduzindo 1 ano se o mês/dia atual for menor que o mês/dia de nascimento
            return today.year - b_date.year - ((today.month, today.day) < (b_date.month, b_date.day))
        return None