from django.shortcuts import render, redirect
from django.views import View
from django.contrib import messages
from django.contrib.auth import login, logout
from django.utils import timezone
from .models import User
from .forms import UserRegistrationForm, UserLoginForm
from .utils.email_verification import send_verification_email

class UserRegisterView(View):
    def get(self, request):
        form = UserRegistrationForm()
        return render(request, 'user/register.html', {'form': form})

    def post(self, request):
        form = UserRegistrationForm(request.POST)
        if form.is_valid():
            user = form.save()
            send_verification_email(request, user)
            messages.success(request, 'Registro realizado! Verifique seu e-mail.')
            return redirect('user:login')
        return render(request, 'user/register.html', {'form': form})

class UserLoginView(View):
    def get(self, request):
        form = UserLoginForm()
        return render(request, 'user/login.html', {'form': form})

    def post(self, request):
        form = UserLoginForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            if not user.email_verified:
                messages.warning(request, 'Verifique seu e-mail para acessar.')
                return redirect('user:login')
            login(request, user)
            return redirect('core:home')
        return render(request, 'user/login.html', {'form': form})

class UserLogoutView(View):
    def get(self, request):
        logout(request)
        return redirect('core:home')

class VerifyEmailView(View):
    def get(self, request, uidb64, token):
        try:
            # Lógica de verificação (implementar conforme mostrado anteriormente)
            messages.success(request, 'E-mail verificado com sucesso!')
            return redirect('user:profile')
        except Exception:
            messages.error(request, 'Link inválido ou expirado.')
            return redirect('user:register')