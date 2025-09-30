from django.db import models
from django.conf import settings
from django.utils.text import slugify
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.db.models.signals import post_save
from django.dispatch import receiver

class Barbershop(models.Model):
    name = models.CharField(max_length=150)
    slug = models.SlugField(unique=True, blank=True)
    logo = models.ImageField(upload_to="barbershop_logos/", null=True, blank=True)
    about = models.TextField(null=True, blank=True)
    foundation_date = models.DateField(null=True, blank=True)
    
    owner_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name="barbershops"
    )
    is_active = models.BooleanField(default=True) 

    def save(self, *args, **kwargs):
    
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
    whatsapp_number = models.CharField(max_length=20, null=True, blank=True) 
    instagram_link = models.URLField(max_length=200, null=True, blank=True) 

    is_active = models.BooleanField(default=True)
    barbershop = models.ForeignKey(
        Barbershop, on_delete=models.CASCADE, related_name="units"
    )
    

    def save(self, *args, **kwargs):
        if not self.slug:
            # cria slug único baseado no nome
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while Unit.objects.filter(slug=slug, barbershop=self.barbershop).exists():
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

    commission_percentage = models.BooleanField(default=False)
    service_commission_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )
    product_commission_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )

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
    Este sinal é acionado sempre que um Employee é salvo.
    Se o Employee estiver sendo CRIADO ('created' será True),
    ele cria os 7 dias de trabalho padrão para ele.
    """
    if created:
        for i in range(7):  # Loop de 0 (Domingo) a 6 (Sábado)
            EmployeeWorkDay.objects.create(
                employee=instance,
                weekday=i,
                # Os horários usarão os valores 'default' definidos no modelo
            )