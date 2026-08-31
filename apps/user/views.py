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
from django.http import JsonResponse
import re

class UserRegisterView(View):
    def get(self, request):
        return render(request, 'user/register.html')

    def post(self, request):
        name = request.POST.get('name')
        last_name = request.POST.get('last_name')
        
        document_type = request.POST.get('document_type', 'CPF')
        document_raw = request.POST.get('document', '')
        
        email = request.POST.get('email')
        phone_raw = request.POST.get('phone', '')
        birth_date = request.POST.get('birth_date')
        password1 = request.POST.get('password1')
        password2 = request.POST.get('password2')

        # Limpeza absoluta: Remove tudo que não for número
        document_clean = re.sub(r'\D', '', document_raw) if document_raw else None
        phone_clean = re.sub(r'\D', '', phone_raw) if phone_raw else None

        # 1. Validações de Preenchimento Básico
        if not name or not last_name or not email or not password1:
            return JsonResponse({'success': False, 'message': 'Preencha todos os campos obrigatórios.'})

        if password1 != password2:
            return JsonResponse({'success': False, 'message': 'As senhas não coincidem.'})
            
        if len(password1) < 6:
            return JsonResponse({'success': False, 'message': 'A senha deve ter pelo menos 6 caracteres.'})

        # 2. VALIDAÇÕES CRÍTICAS DE TAMANHO (DOCUMENTO E NÚMERO)
        if document_clean:
            if document_type == 'CPF' and len(document_clean) != 11:
                return JsonResponse({'success': False, 'message': 'O CPF inválido. Digite exatamente 11 números.'})
            elif document_type == 'CNPJ' and len(document_clean) != 14:
                return JsonResponse({'success': False, 'message': 'O CNPJ inválido. Digite exatamente 14 números.'})

        if phone_clean and len(phone_clean) < 10:
            return JsonResponse({'success': False, 'message': 'WhatsApp inválido. Certifique-se de incluir o DDD.'})

        # 3. Validações de Colisão no Banco de Dados
        if User.objects.filter(email=email).exists():
            return JsonResponse({'success': False, 'message': 'E-mail já registrado no sistema.'})

        if document_clean and User.objects.filter(document=document_clean).exists():
            return JsonResponse({'success': False, 'message': f'{document_type} já registrado no sistema.'})

        try:
            validate_email(email)
        except ValidationError:
            return JsonResponse({'success': False, 'message': 'Digite um e-mail válido.'})
            
        # Criação do usuário dono
        user = User(
            name=name,
            last_name=last_name,
            document_type=document_type,
            document=document_clean,
            email=email,
            phone=phone_raw,  # Salva com a máscara visual formatada no front
            birth_date=birth_date if birth_date else None,
            user_type='dono' 
        )
        user.set_password(password1)
        user.save()

        # Envio de verificação de e-mail (Descomentar em Produção)
        # send_verification_email(request, user)

        return JsonResponse({'success': True, 'message': 'Conta criada com sucesso! Redirecionando para o login...'})


class UserLoginView(View):
    def get(self, request):
        form = UserLoginForm()
        return render(request, 'user/login.html', {'form': form})

    def post(self, request):
        form = UserLoginForm(request.POST)
        if form.is_valid():
            email = form.cleaned_data['email']
            password = form.cleaned_data['password']
            
            user = authenticate(request, username=email, password=password)

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

                elif user.user_type in ['funcionario', 'gerente', 'caixa']:
                    employee = Employee.objects.filter(user=user).select_related("unit__barbershop").first()
                    if not employee:
                        messages.error(request, "Você não está vinculado a nenhuma unidade de barbearia.")
                        return redirect("user:login")

                    if not employee.system_access:
                        messages.error(request, "Seu perfil não possui permissão de acesso ao sistema.")
                        return redirect("user:login")

                    unit = employee.unit
                    barbershop = unit.barbershop
                    if not barbershop.is_active:
                        messages.error(request, "A barbearia está desativada.")
                        return redirect("user:login")

                    login(request, user)
                    return redirect("scheduling:agenda_unit", barbershop_slug=barbershop.slug, unit_slug=unit.slug)

                else:
                    messages.error(request, "Acesso negado para o painel administrativo.")
                    return redirect("user:login")

            else:
                messages.error(request, "E-mail ou senha inválidos")
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
    

from django.contrib.auth import update_session_auth_hash

@login_required
def ProfileView(request):
    user = request.user
    
    funcao_display = "Cliente"
    barbershop = None
    
    is_owner = (user.user_type == 'dono')
    is_manager = False
    
    if is_owner:
        funcao_display = "Titular (Dono da Barbearia)"
        barbershop = Barbershop.objects.filter(owner_user=user).first()
    else:
        emp = Employee.objects.filter(user=user).first()
        if emp:
            barbershop = emp.unit.barbershop
            is_manager = emp.roles.filter(occupation='gerente').exists()
            cargos = [role.get_occupation_display() for role in emp.roles.all()]
            funcao_display = " / ".join(cargos) if cargos else "Funcionário Padrão"

    if request.method == 'POST':
        action = request.POST.get('action', 'update_profile')

        if action == 'change_password':
            old_password = request.POST.get('old_password')
            new_password = request.POST.get('new_password')
            confirm_password = request.POST.get('confirm_password')

            if not user.check_password(old_password):
                messages.error(request, "Sua senha atual está incorreta.")
            elif new_password != confirm_password:
                messages.error(request, "As novas senhas não coincidem.")
            elif len(new_password) < 6:
                messages.error(request, "A nova senha deve ter pelo menos 6 caracteres.")
            else:
                user.set_password(new_password)
                user.save()
                update_session_auth_hash(request, user)
                messages.success(request, "Sua senha foi alterada com segurança!")
            
            return redirect('user:profile')

        elif action == 'update_profile':
            user.name = request.POST.get('name')
            user.last_name = request.POST.get('last_name')
            
            phone = request.POST.get('phone', '')
            user.phone = "".join(filter(str.isdigit, phone)) 
            
            birth_date = request.POST.get('birth_date')
            if birth_date:
                user.birth_date = birth_date
                
            if is_owner:
                doc_type = request.POST.get('document_type')
                document = request.POST.get('document', '')
                import re
                doc_clean = re.sub(r'\D', '', document)
                
                if doc_type in ['CPF', 'CNPJ']:
                    user.document_type = doc_type
                if doc_clean:
                    user.document = doc_clean
                else:
                    user.document = None
                    
            user.save()
            messages.success(request, "Seus dados foram atualizados com sucesso!")
            return redirect('user:profile')

    context = {
        'funcao_display': funcao_display,
        'barbershop': barbershop,
        'is_owner': is_owner,
        'is_manager': is_manager,
    }
    return render(request, 'user/perfil.html', context)