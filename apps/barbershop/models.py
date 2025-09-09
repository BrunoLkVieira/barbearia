from django.db import models
from django.conf import settings
from django.utils.text import slugify



class Barbershop(models.Model):
    name = models.CharField(max_length=150)
    slug = models.SlugField(unique=True, blank=True)
    logo = models.ImageField(upload_to="barbershop_logos/", null=True, blank=True)
    about = models.TextField(null=True, blank=True)
    owner_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name="barbershops"
    )
    is_active = models.BooleanField(default=True)  # 🔥 nova flag

    def save(self, *args, **kwargs):
        # gera slug sempre a partir do name
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
    cep_address = models.CharField(max_length=9)  # formato "00000-000"
    street_address = models.CharField(max_length=255)
    number_address = models.CharField(max_length=10)
    is_active = models.BooleanField(default=True)
    barbershop = models.ForeignKey(
        Barbershop, on_delete=models.CASCADE, related_name="units"
    )

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