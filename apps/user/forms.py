from django import forms
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import User
from .utils.validators import validate_cpf  # 👈 Usa o validador que criamos antes

class UserRegistrationForm(forms.ModelForm):
    password1 = forms.CharField(label='Senha', widget=forms.PasswordInput)
    password2 = forms.CharField(label='Confirmação de Senha', widget=forms.PasswordInput)

    cpf = forms.CharField(
        label="CPF",
        max_length=14,
        validators=[validate_cpf],
        widget=forms.TextInput(attrs={'placeholder': '000.000.000-00'})
    )

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'cpf', 'phone', 'birth_date']

    def clean_password2(self):
        password1 = self.cleaned_data.get('password1')
        password2 = self.cleaned_data.get('password2')
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError('As senhas não coincidem')
        validate_password(password2)
        return password2

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data['password1'])
        if commit:
            user.save()
        return user


class UserLoginForm(forms.Form):
    cpf = forms.CharField(
        label="CPF",
        max_length=14,
        widget=forms.TextInput(attrs={'placeholder': '000.000.000-00'})
    )
    password = forms.CharField(label="Senha", widget=forms.PasswordInput)

    def __init__(self, *args, **kwargs):
        super(UserLoginForm, self).__init__(*args, **kwargs)
        self.user = None

    def clean(self):
        cpf = self.cleaned_data.get('cpf')
        password = self.cleaned_data.get('password')

        if cpf and password:
            self.user = authenticate(cpf=cpf, password=password)
            if self.user is None:
                raise forms.ValidationError("CPF ou senha inválidos.")
        return self.cleaned_data

    def get_user(self):
        return self.user
