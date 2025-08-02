# apps/barbershop/forms.py

from django import forms
from django.forms import inlineformset_factory
from django.contrib.auth import get_user_model
from .models import (
    Barbershop, BarbershopImage, Unit, UnitWorkDay,
    Employee, EmployeeWorkDay, EmployeeAbsence
)

User = get_user_model()

class BarbershopForm(forms.ModelForm):
    """Form para editar configurações da barbearia"""
    
    class Meta:
        model = Barbershop
        fields = [
            'name', 'logo', 'about', 'instagram', 
            'whatsapp', 'facebook'
        ]
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Nome da sua barbearia'
            }),
            'about': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 4,
                'placeholder': 'Conte um pouco sobre sua barbearia...'
            }),
            'instagram': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': '@suabarbearia'
            }),
            'whatsapp': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': '(11) 99999-9999'
            }),
            'facebook': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'facebook.com/suabarbearia'
            }),
            'logo': forms.FileInput(attrs={
                'class': 'form-control',
                'accept': 'image/*'
            })
        }

class BarbershopImageForm(forms.ModelForm):
    """Form para upload de imagens da galeria"""
    
    class Meta:
        model = BarbershopImage
        fields = ['image', 'title', 'order', 'is_banner', 'active']
        widgets = {
            'image': forms.FileInput(attrs={
                'class': 'form-control',
                'accept': 'image/*'
            }),
            'title': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Título da imagem (opcional)'
            }),
            'order': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': 0
            }),
            'is_banner': forms.CheckboxInput(attrs={
                'class': 'form-check-input'
            }),
            'active': forms.CheckboxInput(attrs={
                'class': 'form-check-input'
            })
        }

# FormSet para múltiplas imagens
BarbershopImageFormSet = inlineformset_factory(
    Barbershop, 
    BarbershopImage, 
    form=BarbershopImageForm,
    extra=3,
    can_delete=True
)

class UnitForm(forms.ModelForm):
    """Form para criar/editar unidades"""
    
    class Meta:
        model = Unit
        fields = ['name', 'address', 'latitude', 'longitude', 'is_active']
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Ex: Unidade Centro'
            }),
            'address': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 3,
                'placeholder': 'Endereço completo com CEP'
            }),
            'latitude': forms.NumberInput(attrs={
                'class': 'form-control',
                'step': 'any',
                'placeholder': 'Latitude (opcional)'
            }),
            'longitude': forms.NumberInput(attrs={
                'class': 'form-control',
                'step': 'any',
                'placeholder': 'Longitude (opcional)'
            }),
            'is_active': forms.CheckboxInput(attrs={
                'class': 'form-check-input'
            })
        }

class UnitWorkDayForm(forms.ModelForm):
    """Form para horários de funcionamento da unidade"""
    
    class Meta:
        model = UnitWorkDay
        fields = ['day_of_week', 'start_time', 'end_time', 'is_closed']
        widgets = {
            'day_of_week': forms.Select(attrs={
                'class': 'form-select'
            }),
            'start_time': forms.TimeInput(attrs={
                'class': 'form-control',
                'type': 'time'
            }),
            'end_time': forms.TimeInput(attrs={
                'class': 'form-control',
                'type': 'time'
            }),
            'is_closed': forms.CheckboxInput(attrs={
                'class': 'form-check-input'
            })
        }

# FormSet para dias da semana
UnitWorkDayFormSet = inlineformset_factory(
    Unit,
    UnitWorkDay,
    form=UnitWorkDayForm,
    extra=7,  # 7 dias da semana
    max_num=7,
    can_delete=False
)

class EmployeeForm(forms.ModelForm):
    """Form para adicionar/editar funcionários"""
    
    # Campos adicionais para criar usuário
    first_name = forms.CharField(
        max_length=150,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Nome'
        }),
        label='Nome'
    )
    last_name = forms.CharField(
        max_length=150,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Sobrenome'
        }),
        label='Sobrenome'
    )
    email = forms.EmailField(
        widget=forms.EmailInput(attrs={
            'class': 'form-control',
            'placeholder': 'email@exemplo.com'
        })
    )
    cpf = forms.CharField(
        max_length=14,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': '000.000.000-00'
        })
    )
    phone = forms.CharField(
        max_length=15,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': '(11) 99999-9999'
        }),
        label='Telefone'
    )
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Senha para acesso'
        }),
        label='Senha'
    )
    
    class Meta:
        model = Employee
        fields = [
            'unit', 'role', 'commission_service', 
            'commission_product', 'uses_pot', 'is_active'
        ]
        widgets = {
            'unit': forms.Select(attrs={
                'class': 'form-select'
            }),
            'role': forms.Select(attrs={
                'class': 'form-select'
            }),
            'commission_service': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': 0,
                'max': 100,
                'step': 0.01,
                'placeholder': '0.00'
            }),
            'commission_product': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': 0,
                'max': 100,
                'step': 0.01,
                'placeholder': '0.00'
            }),
            'uses_pot': forms.CheckboxInput(attrs={
                'class': 'form-check-input'
            }),
            'is_active': forms.CheckboxInput(attrs={
                'class': 'form-check-input'
            })
        }
    
    def __init__(self, *args, **kwargs):
        barbershop = kwargs.pop('barbershop', None)
        super().__init__(*args, **kwargs)
        
        if barbershop:
            self.fields['unit'].queryset = barbershop.units.filter(is_active=True)
    
    def clean_email(self):
        email = self.cleaned_data['email']
        if User.objects.filter(email=email).exists():
            raise forms.ValidationError('Este email já está em uso.')
        return email
    
    def clean_cpf(self):
        cpf = self.cleaned_data['cpf']
        if User.objects.filter(cpf=cpf).exists():
            raise forms.ValidationError('Este CPF já está cadastrado.')
        return cpf
    
    def save(self, commit=True):
        # Criar o usuário primeiro
        user = User.objects.create_user(
            username=self.cleaned_data['cpf'],  # CPF como username
            email=self.cleaned_data['email'],
            cpf=self.cleaned_data['cpf'],
            first_name=self.cleaned_data['first_name'],
            last_name=self.cleaned_data['last_name'],
            phone=self.cleaned_data['phone'],
            password=self.cleaned_data['password'],
            tipo_usuario='funcionario'
        )
        
        # Criar o employee
        employee = super().save(commit=False)
        employee.user = user
        
        if commit:
            employee.save()
        
        return employee

class EmployeeWorkDayForm(forms.ModelForm):
    """Form para horários de trabalho do funcionário"""
    
    class Meta:
        model = EmployeeWorkDay
        fields = ['day_of_week', 'start_time', 'end_time', 'is_working']
        widgets = {
            'day_of_week': forms.Select(attrs={
                'class': 'form-select'
            }),
            'start_time': forms.TimeInput(attrs={
                'class': 'form-control',
                'type': 'time'
            }),
            'end_time': forms.TimeInput(attrs={
                'class': 'form-control',
                'type': 'time'
            }),
            'is_working': forms.CheckboxInput(attrs={
                'class': 'form-check-input'
            })
        }

# FormSet para dias de trabalho do funcionário
EmployeeWorkDayFormSet = inlineformset_factory(
    Employee,
    EmployeeWorkDay,
    form=EmployeeWorkDayForm,
    extra=7,
    max_num=7,
    can_delete=False
)

class EmployeeAbsenceForm(forms.ModelForm):
    """Form para registrar ausências"""
    
    class Meta:
        model = EmployeeAbsence
        fields = ['employee', 'date', 'absence_type', 'reason', 'end_date']
        widgets = {
            'employee': forms.Select(attrs={
                'class': 'form-select'
            }),
            'date': forms.DateInput(attrs={
                'class': 'form-control',
                'type': 'date'
            }),
            'absence_type': forms.Select(attrs={
                'class': 'form-select'
            }),
            'reason': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 3,
                'placeholder': 'Motivo da ausência (opcional)'
            }),
            'end_date': forms.DateInput(attrs={
                'class': 'form-control',
                'type': 'date',
                'placeholder': 'Para férias/licenças longas'
            })
        }
    
    def __init__(self, *args, **kwargs):
        barbershop = kwargs.pop('barbershop', None)
        super().__init__(*args, **kwargs)
        
        if barbershop:
            self.fields['employee'].queryset = Employee.objects.filter(
                unit__barbershop=barbershop,
                is_active=True
            )

class BarbershopEmployeeLoginForm(forms.Form):
    """Form de login específico para funcionários da barbearia"""
    
    cpf = forms.CharField(
        max_length=14,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': '000.000.000-00',
            'autofocus': True
        }),
        label='CPF'
    )
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Sua senha'
        }),
        label='Senha'
    )
    
    def __init__(self, *args, **kwargs):
        self.barbershop = kwargs.pop('barbershop', None)
        super().__init__(*args, **kwargs)
        self.user = None
    
    def clean(self):
        cpf = self.cleaned_data.get('cpf')
        password = self.cleaned_data.get('password')
        
        if cpf and password:
            from django.contrib.auth import authenticate
            self.user = authenticate(cpf=cpf, password=password)
            
            if self.user is None:
                raise forms.ValidationError("CPF ou senha inválidos.")
            
            # Verificar se é funcionário desta barbearia
            if self.barbershop:
                try:
                    employee = self.user.employee_profile
                    if (employee.unit.barbershop != self.barbershop or 
                        not employee.is_active):
                        raise forms.ValidationError(
                            "Você não tem permissão para acessar esta barbearia."
                        )
                except:
                    # Verificar se é o dono
                    if self.barbershop.owner_user != self.user:
                        raise forms.ValidationError(
                            "Você não tem permissão para acessar esta barbearia."
                        )
        
        return self.cleaned_data
    
    def get_user(self):
        return self.user