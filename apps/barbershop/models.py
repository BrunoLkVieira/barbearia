# apps/barbershop/models.py

from django.db import models
from django.contrib.auth import get_user_model
from django.utils.text import slugify
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid

User = get_user_model()

class Barbershop(models.Model):
    """Modelo principal da barbearia"""
    name = models.CharField(max_length=100, verbose_name="Nome da Barbearia")
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    logo = models.ImageField(upload_to='barbershops/logos/', blank=True, null=True)
    about = models.TextField(verbose_name="Sobre a Barbearia", blank=True)
    
    # Redes sociais
    instagram = models.CharField(max_length=100, blank=True, null=True)
    whatsapp = models.CharField(max_length=20, blank=True, null=True)
    facebook = models.CharField(max_length=100, blank=True, null=True)
    
    # Dados do dono
    owner_user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='owned_barbershop',
        verbose_name="Dono da Barbearia"
    )
    
    # Controle
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    def save(self, *args, **kwargs):
        """Gera slug automaticamente baseado no nome"""
        if not self.slug:
            base_slug = slugify(self.name)
            unique_slug = base_slug
            counter = 1
            
            while Barbershop.objects.filter(slug=unique_slug).exists():
                unique_slug = f"{base_slug}-{counter}"
                counter += 1
            
            self.slug = unique_slug
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name = "Barbearia"
        verbose_name_plural = "Barbearias"


class BarbershopImage(models.Model):
    """Imagens da galeria/banner da barbearia"""
    barbershop = models.ForeignKey(
        Barbershop, 
        on_delete=models.CASCADE, 
        related_name='images'
    )
    image = models.ImageField(upload_to='barbershops/gallery/')
    title = models.CharField(max_length=100, blank=True)
    order = models.PositiveIntegerField(default=0, verbose_name="Ordem")
    is_banner = models.BooleanField(default=False, verbose_name="É Banner Principal?")
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['order', 'created_at']
        verbose_name = "Imagem da Barbearia"
        verbose_name_plural = "Imagens da Barbearia"
    
    def __str__(self):
        return f"{self.barbershop.name} - {self.title or 'Imagem'}"


class Unit(models.Model):
    """Unidades/Filiais da barbearia"""
    barbershop = models.ForeignKey(
        Barbershop, 
        on_delete=models.CASCADE, 
        related_name='units'
    )
    name = models.CharField(max_length=100, verbose_name="Nome da Unidade")
    address = models.TextField(verbose_name="Endereço Completo")
    
    # Coordenadas para mapa (opcional)
    latitude = models.DecimalField(
        max_digits=10, 
        decimal_places=7, 
        blank=True, 
        null=True
    )
    longitude = models.DecimalField(
        max_digits=10, 
        decimal_places=7, 
        blank=True, 
        null=True
    )
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.barbershop.name} - {self.name}"
    
    class Meta:
        verbose_name = "Unidade"
        verbose_name_plural = "Unidades"


class UnitWorkDay(models.Model):
    """Dias e horários de funcionamento das unidades"""
    DAYS_OF_WEEK = [
        (0, 'Segunda-feira'),
        (1, 'Terça-feira'),
        (2, 'Quarta-feira'),
        (3, 'Quinta-feira'),
        (4, 'Sexta-feira'),
        (5, 'Sábado'),
        (6, 'Domingo'),
    ]
    
    unit = models.ForeignKey(
        Unit, 
        on_delete=models.CASCADE, 
        related_name='work_days'
    )
    day_of_week = models.IntegerField(choices=DAYS_OF_WEEK)
    start_time = models.TimeField(verbose_name="Horário de Abertura")
    end_time = models.TimeField(verbose_name="Horário de Fechamento")
    is_closed = models.BooleanField(default=False, verbose_name="Fechado neste dia")
    
    class Meta:
        unique_together = ['unit', 'day_of_week']
        ordering = ['day_of_week']
        verbose_name = "Dia de Funcionamento"
        verbose_name_plural = "Dias de Funcionamento"
    
    def __str__(self):
        day_name = dict(self.DAYS_OF_WEEK)[self.day_of_week]
        if self.is_closed:
            return f"{self.unit.name} - {day_name}: Fechado"
        return f"{self.unit.name} - {day_name}: {self.start_time} às {self.end_time}"


class Employee(models.Model):
    """Funcionários da barbearia"""
    EMPLOYEE_ROLES = [
        ('barbeiro', 'Barbeiro'),
        ('gerente', 'Gerente'),
        ('caixa', 'Operador de Caixa'),
        ('dono', 'Dono'),
    ]
    
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='employee_profile'
    )
    unit = models.ForeignKey(
        Unit, 
        on_delete=models.CASCADE, 
        related_name='employees'
    )
    role = models.CharField(max_length=20, choices=EMPLOYEE_ROLES)
    
    # Comissões
    commission_service = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=0.00,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name="Comissão por Serviço (%)"
    )
    commission_product = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=0.00,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name="Comissão por Produto (%)"
    )
    
    # Participação no "pote" dos planos
    uses_pot = models.BooleanField(
        default=True, 
        verbose_name="Participa do Pote de Planos"
    )
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.get_role_display()}"
    
    class Meta:
        verbose_name = "Funcionário"
        verbose_name_plural = "Funcionários"


class EmployeeWorkDay(models.Model):
    """Dias e horários de trabalho dos funcionários"""
    DAYS_OF_WEEK = [
        (0, 'Segunda-feira'),
        (1, 'Terça-feira'),
        (2, 'Quarta-feira'),
        (3, 'Quinta-feira'),
        (4, 'Sexta-feira'),
        (5, 'Sábado'),
        (6, 'Domingo'),
    ]
    
    employee = models.ForeignKey(
        Employee, 
        on_delete=models.CASCADE, 
        related_name='work_days'
    )
    day_of_week = models.IntegerField(choices=DAYS_OF_WEEK)
    start_time = models.TimeField(verbose_name="Início do Expediente")
    end_time = models.TimeField(verbose_name="Fim do Expediente")
    is_working = models.BooleanField(default=True, verbose_name="Trabalha neste dia")
    
    class Meta:
        unique_together = ['employee', 'day_of_week']
        ordering = ['day_of_week']
        verbose_name = "Dia de Trabalho do Funcionário"
        verbose_name_plural = "Dias de Trabalho dos Funcionários"
    
    def __str__(self):
        day_name = dict(self.DAYS_OF_WEEK)[self.day_of_week]
        if not self.is_working:
            return f"{self.employee.user.get_full_name()} - {day_name}: Folga"
        return f"{self.employee.user.get_full_name()} - {day_name}: {self.start_time} às {self.end_time}"


class EmployeeAbsence(models.Model):
    """Faltas, férias e ausências dos funcionários"""
    ABSENCE_TYPES = [
        ('falta', 'Falta'),
        ('ferias', 'Férias'),
        ('atestado', 'Atestado Médico'),
        ('licenca', 'Licença'),
        ('folga_extra', 'Folga Extra'),
    ]
    
    employee = models.ForeignKey(
        Employee, 
        on_delete=models.CASCADE, 
        related_name='absences'
    )
    date = models.DateField(verbose_name="Data da Ausência")
    absence_type = models.CharField(max_length=20, choices=ABSENCE_TYPES)
    reason = models.TextField(blank=True, verbose_name="Motivo/Observações")
    
    # Para férias e licenças longas
    end_date = models.DateField(blank=True, null=True, verbose_name="Data Final")
    
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='registered_absences'
    )
    
    class Meta:
        ordering = ['-date']
        verbose_name = "Ausência de Funcionário"
        verbose_name_plural = "Ausências de Funcionários"
    
    def __str__(self):
        return f"{self.employee.user.get_full_name()} - {self.get_absence_type_display()} em {self.date}"


class Client(models.Model):
    """Clientes das barbearias"""
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='client_profiles'
    )
    barbershop = models.ForeignKey(
        Barbershop, 
        on_delete=models.CASCADE, 
        related_name='clients'
    )
    
    # Dados específicos do cliente nesta barbearia
    notes = models.TextField(blank=True, verbose_name="Observações do Cliente")
    first_visit = models.DateField(auto_now_add=True, verbose_name="Primeira Visita")
    last_visit = models.DateField(blank=True, null=True, verbose_name="Última Visita")
    
    # Preferências
    preferred_barber = models.ForeignKey(
        Employee, 
        on_delete=models.SET_NULL, 
        blank=True, 
        null=True, 
        related_name='preferred_clients',
        verbose_name="Barbeiro Preferido"
    )
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['user', 'barbershop']
        verbose_name = "Cliente"
        verbose_name_plural = "Clientes"
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.barbershop.name}"