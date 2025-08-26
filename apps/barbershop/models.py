from django.db import models
from django.conf import settings
from django.utils.text import slugify


class Barbershop(models.Model):
    name = models.CharField(max_length=150)
    slug = models.SlugField(unique=True, blank=True)
    logo = models.ImageField(upload_to="barbershop_logos/", null=True, blank=True)
    about = models.TextField(null=True, blank=True)
    owner_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="barbershops"
    )
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)


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
