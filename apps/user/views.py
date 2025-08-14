from django.shortcuts import render, redirect
from django.views import View
from django.contrib import messages
from django.contrib.auth import login, logout, authenticate
from django.utils.http import urlsafe_base64_decode
from django.contrib.auth.tokens import default_token_generator
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
            user = form.save(commit=False)
            user.cpf = user.cpf.replace('.', '').replace('-', '')
            user.save()
            send_verification_email(request, user)
            messages.success(request, 'Registro realizado! Verifique seu e-mail.')
            return redirect('user:login')
        return render(request, 'user/register.html', {'form': form})


class UserLoginView(View):
    def get(self, request):
        form = UserLoginForm()
        return render(request, 'user/login.html', {'form': form})

    def post(self, request):
        form = UserLoginForm(request.POST)
        if form.is_valid():
            cpf = form.cleaned_data['cpf'].replace('.', '').replace('-', '')
            password = form.cleaned_data['password']
            user = authenticate(request, username=cpf, password=password)

            if user is not None:
                if user.user_type == 'dono' or user.user_type == 'funcionario':
                    login(request, user)
                    return redirect("user:home")
                else:
                    messages.error(request, "Você não é um funcionário de nenhuma barbearia")
            else:
                messages.error(request, "CPF ou senha inválidos")
        else:
            messages.error(request, "Preencha todos os campos corretamente.")

        return render(request, 'user/login.html', {'form': form})




class UserLogoutView(View):
    def get(self, request):
        logout(request)
        return redirect('user:login')


class HomeView(View):
    def get(self, request):
        return render(request, 'user/home.html')


class VerifyEmailView(View):
    def get(self, request, uidb64, token):
        try:
            uid = urlsafe_base64_decode(uidb64).decode()
            user = User.objects.get(pk=uid)

            if default_token_generator.check_token(user, token):
                user.email_verified = True
                user.save()
                messages.success(request, 'E-mail verificado com sucesso!')
                return redirect('user:login')
            else:
                messages.error(request, 'Token inválido ou expirado.')
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            messages.error(request, 'Ocorreu um erro ao verificar o e-mail.')
        return redirect('user:register')
 