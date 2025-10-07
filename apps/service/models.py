# apps/services/models.py

from django.db import models
from django.urls import reverse
from apps.barbershop.models import Employee 

class BaseService(models.Model):
    name = models.CharField("Nome Base", max_length=100, unique=True)
    
    class IconChoices(models.TextChoices):
        TESOURA = 'fa-cut', 'Tesoura'
        NAVALHA = 'fa-sharp', 'Navalha'
        PENTE = 'fa-comb', 'Pente'
    
    icon = models.CharField(
        "Ícone", 
        max_length=20, 
        choices=IconChoices.choices, 
        null=True, 
        blank=True
    )

    def __str__(self):
        return self.name

class BarberService(models.Model):
    name = models.CharField("Nome do Serviço", max_length=200)
    price = models.DecimalField("Preço", max_digits=10, decimal_places=2, default=0.00)
    duration = models.PositiveIntegerField("Duração (em minutos)", default=30)
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='services',
        verbose_name="Funcionário"
    )
    base_service = models.ForeignKey(
        BaseService,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        verbose_name="Serviço Base"
    )

    class Meta:
        verbose_name = "Serviço do Barbeiro"
        verbose_name_plural = "Serviços do Barbeiro"
        ordering = ['name']

    def __str__(self):
        return f"{self.name} - {self.employee.user.username}"

    def get_absolute_url(self):
        return reverse('services:list')