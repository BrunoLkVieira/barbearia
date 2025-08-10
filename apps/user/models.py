from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    email = models.EmailField(unique=True)
    cpf = models.CharField(max_length=14, unique=True)
    phone = models.CharField(max_length=15, blank=True, null=True)
    birth_date = models.DateField(blank=True, null=True)
    photo = models.ImageField(upload_to='users/photos/', blank=True, null=True)
    username = models.CharField(
        max_length=150,
        unique=False,   # ❌ Desliga a unicidade
        blank=True,     # ✅ Permite valor vazio no formulário
        null=True       # ✅ Permite valor nulo no banco (opcional, mas útil)
    )

    tipo_usuario = models.CharField(
        choices=[
            ('cliente', 'Cliente'),
            ('funcionario', 'Funcionário'),
            ('dono', 'Dono da Barbearia')
        ],
        max_length=20,
        default='cliente'
    )

    email_verified = models.BooleanField(default=False)
    verification_token = models.CharField(max_length=100, blank=True, null=True)
    verification_sent_at = models.DateTimeField(blank=True, null=True)

    USERNAME_FIELD = 'cpf'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    def __str__(self):
        return self.get_full_name() or self.email

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
