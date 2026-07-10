from django.db import models
from apps.client.models import Client
from apps.barbershop.models import Employee, Barbershop, Unit
from apps.service.models import BarberService

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

    def __str__(self):
        return f"{self.date} às {self.time} - {self.client.first_name}"
    

class AppointmentService(models.Model):
    appointment = models.ForeignKey(Appointment, on_delete=models.CASCADE, related_name='services')
    service = models.ForeignKey(BarberService, on_delete=models.PROTECT)
    
    price_at_sale = models.DecimalField(max_digits=10, decimal_places=2)
    
    # NOVO: A "foto" da comissão no momento da venda (Blinda o histórico)
    barber_commission_value = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    def __str__(self):
        return f"{self.service.name} em {self.appointment}"