from django.db import models
from django.conf import settings
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _
from django.db.models.signals import post_save
from django.dispatch import receiver
from datetime import time
from django.db.models import Count, Q, ProtectedError

class Barbershop(models.Model):
    name = models.CharField(max_length=150)
    slug = models.SlugField(unique=True, blank=True)
    logo = models.ImageField(upload_to="barbershop_logos/", null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    foundation_date = models.DateField(null=True, blank=True)
    
    # --- REGRAS DE NEGÓCIO (LIMITES SAAS) ---
    max_employees = models.PositiveIntegerField("Limite de Vagas (Funcionários)", default=5)
    max_units = models.PositiveIntegerField("Limite de Unidades", default=1)
    
    owner_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name="barbershops"
    )
    is_active = models.BooleanField(default=True) 

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while Barbershop.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class Unit(models.Model):
    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=160, unique=True, blank=True)
    cep_address = models.CharField(max_length=9)  
    street_address = models.CharField(max_length=255)
    number_address = models.CharField(max_length=10)
    neighborhood = models.CharField(max_length=100, null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)        
    state = models.CharField(max_length=2, null=True, blank=True)    
    about_text = models.TextField(null=True, blank=True)
    about_image = models.ImageField(upload_to="about_units/", null=True, blank=True)
    map_link = models.TextField(null=True, blank=True) 
    whatsapp_number = models.CharField(max_length=20, null=True, blank=True) 
    instagram_link = models.URLField(max_length=200, null=True, blank=True) 

    is_active = models.BooleanField(default=True)
    barbershop = models.ForeignKey(
        Barbershop, on_delete=models.CASCADE, related_name="units"
    )
    
    def save(self, *args, **kwargs):
        if self.street_address:
            query = f"{self.street_address}, {self.number_address}, {self.neighborhood}, {self.city}, {self.state}"
            self.map_link = f"https://maps.google.com/maps?q={query}&t=&z=15&ie=UTF8&iwloc=&output=embed"
        
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while Unit.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["barbershop", "name"], name="unique_unit_name_per_barbershop")
        ]

    def __str__(self):
        return f"{self.name} - {self.barbershop.name}"

class Employee(models.Model):
    CONTRACT_CHOICES = [
        ('commission', 'Comissionado (100% Produtividade)'),
        ('fixed_salary', 'Salário Fixo (+ Comissão)'),
        ('fixed_only', 'Apenas Salário Fixo'),
        ('chair_rental', 'Aluguel de Cadeira (Coworking)'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        related_name="employees"
    )
    unit = models.ForeignKey(
        Unit, 
        on_delete=models.CASCADE,
        related_name="employees"
    )
    
    is_active = models.BooleanField("Funcionário Ativo", default=True)
    bio = models.CharField(max_length=255, null=True, blank=True)
    specialty = models.CharField(max_length=50, null=True, blank=True)
    
    # --- FINANCEIRO E CONTRATOS ---
    contract_type = models.CharField(max_length=20, choices=CONTRACT_CHOICES, default='commission')
    fixed_salary = models.DecimalField("Salário Fixo", max_digits=10, decimal_places=2, null=True, blank=True)
    chair_rental_fee = models.DecimalField("Aluguel da Cadeira", max_digits=10, decimal_places=2, null=True, blank=True)
    
    commission_percentage = models.BooleanField(default=False)
    service_commission_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    product_commission_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    # --- PERMISSÕES DE ACESSO ---
    can_manage_cashbox = models.BooleanField(default=False)
    can_register_sell = models.BooleanField(default=False)
    can_create_appointments = models.BooleanField(default=False)
    system_access = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user} - {self.unit}"

class UnitWorkDay(models.Model):
    class Weekday(models.IntegerChoices):
        SUNDAY = 0, _("Domingo")
        MONDAY = 1, _("Segunda-feira")
        TUESDAY = 2, _("Terça-feira")
        WEDNESDAY = 3, _("Quarta-feira")
        THURSDAY = 4, _("Quinta-feira")
        FRIDAY = 5, _("Sexta-feira")
        SATURDAY = 6, _("Sábado")

    unit = models.ForeignKey("Unit", on_delete=models.CASCADE, related_name="work_days")
    weekday = models.IntegerField(choices=Weekday.choices)
    open_time = models.TimeField()
    close_time = models.TimeField()
    is_open = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.unit} - {self.get_weekday_display()}"

class EmployeeWorkDay(models.Model):
    class Weekday(models.IntegerChoices):
        SUNDAY = 0, _("Dom")
        MONDAY = 1, _("Seg")
        TUESDAY = 2, _("Ter")
        WEDNESDAY = 3, _("Qua")
        THURSDAY = 4, _("Qui")
        FRIDAY = 5, _("Sex")
        SATURDAY = 6, _("Sab")

    employee = models.ForeignKey("Employee", on_delete=models.CASCADE, related_name="work_days")
    weekday = models.IntegerField(choices=Weekday.choices)

    start_morning_work = models.TimeField(default="07:00", null=True, blank=True)
    end_morning_work = models.TimeField(default="12:00", null=True, blank=True)
    start_afternoon_work = models.TimeField(default="12:30", null=True, blank=True)
    end_afternoon_work = models.TimeField(default="23:00", null=True, blank=True)

    morning_available = models.BooleanField(default=False, null=True, blank=True)
    afternoon_available = models.BooleanField(default=False, null=True, blank=True)

    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.employee} - {self.get_weekday_display()}"

class EmployeeAbsence(models.Model):
    employee = models.ForeignKey("Employee", on_delete=models.CASCADE, related_name="absences")
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"{self.employee} - {self.start_date} até {self.end_date}"

class UnitHoliday(models.Model):
    unit = models.ForeignKey("Unit", on_delete=models.CASCADE, related_name="holidays")
    date = models.DateField()
    name = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.unit} - {self.name} ({self.date})"

class Role(models.Model):
    class Occupation(models.TextChoices):
        BARBEIRO = "barbeiro", _("Barbeiro")
        GERENTE = "gerente", _("Gerente")
        CAIXA = "caixa", _("Caixa")

    employee = models.ForeignKey("Employee", on_delete=models.CASCADE, related_name="roles")
    occupation = models.CharField(max_length=20, choices=Occupation.choices)

    def __str__(self):
        return f"{self.employee} - {self.get_occupation_display()}"

class UnitMedia(models.Model):
    class MediaType(models.TextChoices):
        BANNER = "banner", _("Banner")
        HAIRSTYLE = "hairstyle", _("Foto de Corte de Cabelo")
        SHOP_PHOTO = "shop_photo", _("Foto da Barbearia")
        PRODUCT = "product", _("Foto de Produto")

    unit = models.ForeignKey("Unit", on_delete=models.CASCADE, related_name="media")
    media_type = models.CharField(max_length=12, choices=MediaType.choices)
    image = models.ImageField(upload_to="unit_media/")
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.unit} - {self.get_media_type_display()} ({self.order})"

@receiver(post_save, sender=Employee)
def create_employee_work_days(sender, instance, created, **kwargs):
    """
    Quando um funcionário é criado, automatiza a grade de horários lendo 
    a grade da Unidade. Insere intervalo de almoço das 12h às 13h nativamente.
    """
    if created:
        unit_wds = {wd.weekday: wd for wd in instance.unit.work_days.all()}
        
        for i in range(7):
            wd = unit_wds.get(i)
            
            if wd and wd.is_open:
                start_morning = wd.open_time
                end_morning = time(12, 0) if wd.close_time >= time(12, 0) else wd.close_time
                
                start_afternoon = time(13, 0) if wd.close_time > time(13, 0) else None
                end_afternoon = wd.close_time if start_afternoon else None

                EmployeeWorkDay.objects.create(
                    employee=instance,
                    weekday=i,
                    is_active=True,
                    morning_available=True,
                    afternoon_available=bool(start_afternoon),
                    start_morning_work=start_morning,
                    end_morning_work=end_morning,
                    start_afternoon_work=start_afternoon,
                    end_afternoon_work=end_afternoon
                )
            else:
                EmployeeWorkDay.objects.create(
                    employee=instance,
                    weekday=i,
                    is_active=False,
                    morning_available=False,
                    afternoon_available=False
                )