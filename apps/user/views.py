from django.shortcuts import render, redirect
from django.views import View
from django.contrib import messages
from django.contrib.auth import login, logout, authenticate
from django.utils.http import urlsafe_base64_decode
from django.contrib.auth.tokens import default_token_generator
from .models import User
from .forms import UserRegistrationForm, UserLoginForm
from .utils.email_verification import send_verification_email
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from apps.barbershop.models import Barbershop, Employee 
from django.contrib.auth.decorators import login_required

class UserRegisterView(View):
    def get(self, request):
        return render(request, 'user/register.html')

    def post(self, request):
        # origin = request.GET.get('origin', 'client') 
        name = request.POST.get('name')
        last_name = request.POST.get('last_name')
        cpf = request.POST.get('cpf')
        email = request.POST.get('email')
        phone = request.POST.get('phone')
        birth_date = request.POST.get('birth_date')
        password1 = request.POST.get('password1')
        password2 = request.POST.get('password2')

        # Validações básicas
        cpf = cpf.replace('.', '').replace('-', '')

        if User.objects.filter(cpf=cpf).exists():
            messages.error(request, "CPF já registrado.")
            return redirect('system_plan:landing_page')

        if User.objects.filter(email=email).exists():
            messages.error(request, "E-mail já registrado.")
            return redirect('system_plan:landing_page')

        try:
            validate_email(email)
        except ValidationError:
            messages.error(request, "Digite um e-mail válido.")
            return redirect('system_plan:landing_page')
            
        # Criação do usuário
        user = User(
            name=name,
            last_name=last_name,
            cpf=cpf,
            email=email,
            phone=phone,
            birth_date=birth_date,
            # user_type=origin
        )
        user.set_password(password1)
        user.save()

        # Envio de verificação de e-mail
        send_verification_email(request, user)

        messages.success(request, "Registro realizado! Verifique seu e-mail.")
        return redirect('user:login')


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
                if user.user_type == 'dono':
                    barbershop = Barbershop.objects.filter(owner_user=user).first()
                    if not barbershop:
                        messages.error(request, "Você ainda não possui uma barbearia cadastrada.")
                        return redirect("user:login")
                    if not barbershop.is_active:
                        messages.error(request, "Sua barbearia está desativada.")
                        return redirect("user:login")
                        
                    login(request, user)
                    return redirect("scheduling:agenda", barbershop_slug=barbershop.slug)

                elif user.user_type in ['funcionario', 'gerente']:
                    employee = Employee.objects.filter(user=user).select_related("unit__barbershop").first()
                    if not employee:
                        messages.error(request, "Você não está vinculado a nenhuma unidade de barbearia.")
                        return redirect("user:login")

                    # ============================================================
                    # CORREÇÃO: Barra o acesso ANTES de logar e devolve pro Login!
                    # ============================================================
                    if not employee.system_access:
                        messages.error(request, "Seu perfil não possui permissão de acesso ao sistema.")
                        return redirect("user:login")

                    unit = employee.unit
                    barbershop = unit.barbershop
                    if not barbershop.is_active:
                        messages.error(request, "A barbearia está desativada.")
                        return redirect("user:login")

                    # Se passou em tudo, loga com sucesso e manda pra agenda dele!
                    login(request, user)
                    return redirect("scheduling:agenda_unit", barbershop_slug=barbershop.slug, unit_slug=unit.slug)

                else:
                    messages.error(request, "Acesso negado.")
                    return redirect("user:login")

            else:
                messages.error(request, "CPF ou senha inválidos")
        else:
            messages.error(request, "Preencha todos os campos corretamente.")

        return render(request, 'user/login.html', {'form': form})


class UserLogoutView(View):
    def get(self, request):
        logout(request)
        storage = messages.get_messages(request)
        storage.used = True
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
    


@login_required
def ProfileView(request):
    user = request.user
    
    funcao_display = "Cliente"
    barbershop = None
    
    # 1. Definindo as permissões base para o nav.html
    is_owner = (user.user_type == 'dono')
    is_manager = False
    
    if is_owner:
        funcao_display = "Titular (Dono da Barbearia)"
        barbershop = Barbershop.objects.filter(owner_user=user).first()
    else:
        emp = Employee.objects.filter(user=user).first()
        if emp:
            barbershop = emp.unit.barbershop
            
            # Verifica se o funcionário é gerente para liberar o menu
            is_manager = emp.roles.filter(occupation='gerente').exists()
            
            cargos = [role.get_occupation_display() for role in emp.roles.all()]
            if cargos:
                funcao_display = " / ".join(cargos)
            else:
                funcao_display = "Funcionário Padrão"

    if request.method == 'POST':
        user.name = request.POST.get('name')
        user.last_name = request.POST.get('last_name')
        
        phone = request.POST.get('phone', '')
        user.phone = "".join(filter(str.isdigit, phone)) 
        
        birth_date = request.POST.get('birth_date')
        if birth_date:
            user.birth_date = birth_date
            
        user.save()
        messages.success(request, "Seus dados foram atualizados com sucesso!")
        return redirect('user:profile')

    # 2. Mandando TUDO para o HTML para a Navbar funcionar
    context = {
        'funcao_display': funcao_display,
        'barbershop': barbershop,
        'is_owner': is_owner,      # Faz o menu de dono aparecer!
        'is_manager': is_manager,  # Faz o menu de gerente aparecer!
    }
    return render(request, 'user/perfil.html', context)