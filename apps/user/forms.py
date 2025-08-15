from django import forms
from django.contrib.auth.forms import ReadOnlyPasswordHashField
from django.contrib.auth import authenticate
from .models import User

# ----- Forms do Admin -----
class UserCreationForm(forms.ModelForm):
    password1 = forms.CharField(label='Senha', widget=forms.PasswordInput)
    password2 = forms.CharField(label='Confirme a senha', widget=forms.PasswordInput)

    class Meta:
        model = User
        fields = ('cpf', 'email', 'name', 'user_type')

    def clean_password2(self):
        password1 = self.cleaned_data.get('password1')
        password2 = self.cleaned_data.get('password2')
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError("As senhas não coincidem")
        return password2

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data['password1'])
        if commit:
            user.save()
        return user


class UserChangeForm(forms.ModelForm):
    password = ReadOnlyPasswordHashField()

    class Meta:
        model = User
        fields = ('cpf', 'email', 'name', 'user_type', 'password', 'is_active', 'is_staff', 'is_superuser')

    def clean_password(self):
        return self.initial['password']


# ----- Forms das Views -----
class UserRegistrationForm(forms.ModelForm):
    password1 = forms.CharField(label='Senha', widget=forms.PasswordInput)
    password2 = forms.CharField(label='Confirme a senha', widget=forms.PasswordInput)

    class Meta:
        model = User
        fields = ('cpf', 'email', 'name','last_name','phone', 'user_type', 'birth_date')

    def clean_password2(self):
        password1 = self.cleaned_data.get('password1')
        password2 = self.cleaned_data.get('password2')
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError("As senhas não coincidem")
        return password2

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data['password1'])
        if commit:
            user.save()
        return user


class UserLoginForm(forms.Form):
    cpf = forms.CharField(label='CPF')
    password = forms.CharField(label='Senha', widget=forms.PasswordInput)

    def clean(self):
        cpf = self.cleaned_data.get('cpf')
        password = self.cleaned_data.get('password')
        user = authenticate(cpf=cpf, password=password)
        if not user:
            raise forms.ValidationError("CPF ou senha inválidos")
        self.cleaned_data['user'] = user
        return self.cleaned_data
