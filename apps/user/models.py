import re
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models

class UserManager(BaseUserManager):
    # O E-mail agora é o campo obrigatório para criar a conta
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('O E-mail é obrigatório')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    DOCUMENT_CHOICES = [
        ('CPF', 'CPF'),
        ('CNPJ', 'CNPJ'),
    ]
    # Novos campos de documento (Opcionais para clientes, editáveis para donos)
    document_type = models.CharField(max_length=4, choices=DOCUMENT_CHOICES, default='CPF', null=True, blank=True)
    document = models.CharField(max_length=14, unique=True, null=True, blank=True)
    
    # Email vira a chave principal (Login)
    email = models.EmailField(unique=True)
    
    name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, blank=True, null=True)
    birth_date = models.DateField(blank=True, null=True)
    profile_picture = models.ImageField(upload_to="profile_pics/", null=True, blank=True)
    
    user_type = models.CharField(
        max_length=20,
        choices=[('dono', 'Dono'), ('cliente', 'Cliente'),('gerente', 'Gerente'),('funcionario', 'Funcionário')],
        default='cliente'
    )
    email_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UserManager()

    # Define o Email como login
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name', 'last_name']

    def __str__(self):
        return f"{self.name} {self.last_name}"
    
    @property
    def initials(self):
        first = self.name[0].upper() if self.name else ""
        last_word = self.last_name.split()[-1] if self.last_name else ""
        last = last_word[0].upper() if last_word else ""
        return f"{first}{last}"

    # Limpa a pontuação do CPF/CNPJ antes de salvar no banco
    def save(self, *args, **kwargs):
        if self.document:
            self.document = re.sub(r'\D', '', self.document)
        elif self.document == "":
            self.document = None # Evita erro de valor único vazio no banco
            
        super(User, self).save(*args, **kwargs)