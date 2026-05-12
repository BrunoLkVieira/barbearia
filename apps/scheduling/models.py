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

    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='appointments')
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='appointments')
    barbershop = models.ForeignKey(Barbershop, on_delete=models.CASCADE)
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE)
    
    date = models.DateField()
    time = models.TimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    
    # Campo para observações (ex: "cliente prefere tesoura")
    notes = models.TextField(blank=True, null=True)
    
    # Controle financeiro básico para o histórico
    is_paid = models.BooleanField(default=False)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.date} às {self.time} - {self.client.first_name}"
    

class AppointmentService(models.Model):
    appointment = models.ForeignKey(Appointment, on_delete=models.CASCADE, related_name='services')
    service = models.ForeignKey(BarberService, on_delete=models.PROTECT)
    
    # Salvamos o preço aqui para histórico, mesmo que o serviço mude de preço no futuro
    price_at_sale = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.service.name} em {self.appointment}"