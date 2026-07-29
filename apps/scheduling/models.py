from django.db import models
from apps.client.models import Client
from apps.barbershop.models import Employee, Barbershop, Unit
from apps.service.models import BarberService
from decimal import Decimal

class Appointment(models.Model):
    STATUS_CHOICES = [
        ('scheduled', 'Agendado'),
        ('completed', 'Finalizado'),
        ('cancelled', 'Cancelado'),
    ]
    PAYMENT_CHOICES = [
        ('cash', 'Dinheiro'),
        ('card', 'Cartão'),
        ('pix', 'PIX'),
    ]

    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='appointments')
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='appointments')
    barbershop = models.ForeignKey(Barbershop, on_delete=models.CASCADE)
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE)
    
    date = models.DateField()
    time = models.TimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    
    notes = models.TextField(blank=True, null=True)
    
    # Controle financeiro
    is_paid = models.BooleanField(default=False)
    payment_type = models.CharField(max_length=20, choices=PAYMENT_CHOICES, blank=True, null=True)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        # [BLINDAGEM] Força o recálculo dos serviços atrelados se o agendamento for editado
        if not is_new:
            for servico in self.services.all():
                servico.save()

    def __str__(self):
        return f"{self.date} às {self.time} - {self.client.first_name}"
    

class AppointmentService(models.Model):
    appointment = models.ForeignKey(Appointment, on_delete=models.CASCADE, related_name='services')
    service = models.ForeignKey(BarberService, on_delete=models.SET_NULL, null=True)
    price_at_sale = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    barber_commission_value = models.DecimalField(max_digits=7, decimal_places=2, default=0.00)

    def save(self, *args, **kwargs):
        is_new = self.pk is None

        # 1. Congela o preço no momento da venda (Snapshot)
        if not self.price_at_sale and self.service:
            self.price_at_sale = self.service.price

        # 2. [SNAPSHOT FINANCEIRO] - Calcula a comissão UMA ÚNICA VEZ. 
        # Garante a imutabilidade do passado caso a comissão do barbeiro mude no futuro.
        if is_new and self.appointment_id:
            emp = self.appointment.employee
            if emp and emp.service_commission_percentage and Decimal(emp.service_commission_percentage) > 0:
                percentual = Decimal(emp.service_commission_percentage) / Decimal('100.00')
                self.barber_commission_value = Decimal(self.price_at_sale or 0.00) * percentual
            else:
                self.barber_commission_value = Decimal('0.00')

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.service.name} - {self.appointment.id}"