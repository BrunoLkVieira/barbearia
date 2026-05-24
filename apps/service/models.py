# apps/services/models.py

from django.db import models
from django.urls import reverse
from apps.barbershop.models import Employee 

class BaseService(models.Model):
    name = models.CharField("Nome Base", max_length=100, unique=True)
    
    class IconChoices(models.TextChoices):
        TESOURA = 'fas fa-cut', 'Tesoura / Corte'
        MAQUINA = 'fas fa-bolt', 'Máquina / Degradê'
        NAVALHA = 'fas fa-magic', 'Navalha / Acabamento'
        BARBA = 'fas fa-user-tie', 'Barba / Modelagem'
        PENTEADO = 'fas fa-wind', 'Penteado / Secador'
        LAVAGEM = 'fas fa-tint', 'Lavagem / Hidratação'
        QUIMICA = 'fas fa-spray-can', 'Química / Pigmentação'
        ESTETICA = 'fas fa-hand-sparkles', 'Estética / Massagem'
        SOBRANCELHA = 'fas fa-eye', 'Sobrancelha'
        KIDS = 'fas fa-child', 'Corte Infantil'
        ESPECIAL = 'fas fa-star', 'Pacote Especial'
    
    icon = models.CharField(
        "Ícone", 
        max_length=50, 
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
        return f"{self.name} - {self.employee.user.name}"

    def get_absolute_url(self):
        return reverse('services:list_general', kwargs={'barbershop_slug': self.employee.unit.barbershop.slug})