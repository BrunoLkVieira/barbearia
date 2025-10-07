# apps/products/models.py

from django.db import models
from django.urls import reverse
from apps.barbershop.models import Barbershop 

class Product(models.Model):
    name = models.CharField("Nome", max_length=200)
    price = models.DecimalField("Preço", max_digits=10, decimal_places=2, default=0.00)
    stock_quantity = models.PositiveIntegerField("Quantidade em Estoque", default=0)
    icon = models.CharField("Ícone", max_length=50, null=True, blank=True)
    barbershop = models.ForeignKey(
        Barbershop,
        on_delete=models.CASCADE,
        related_name='products',
        verbose_name="Barbearia"
    )

    class Meta:
        verbose_name = "Produto"
        verbose_name_plural = "Produtos"
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.barbershop.name})"

    def get_absolute_url(self):
        return reverse('products:list')