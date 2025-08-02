# apps/barbershop/views.py - ATUALIZADO

from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth import login, authenticate
from django.contrib import messages
from django.views.generic import ListView, DetailView, CreateView, UpdateView
from django.urls import reverse_lazy, reverse
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views.decorators.http import require_http_methods
from django.views import View
import json

from .models import (
    Barbershop, BarbershopImage, Unit, UnitWorkDay,
    Employee, EmployeeWorkDay, EmployeeAbsence, Client
)
from .forms import (
    BarbershopForm, BarbershopImageFormSet, UnitForm, UnitWorkDayFormSet,
    EmployeeForm, EmployeeWorkDayFormSet, EmployeeAbsenceForm,
    BarbershopEmployeeLoginForm
)

class BarbershopMixin:
    """Mixin para views que precisam da barbearia"""
    
    def get_barbershop(self):
        """Retorna a barbearia baseada no slug da URL"""
        slug = self.kwargs.get('slug')
        return get_object_or_404(Barbershop, slug=slug, is_active=True)
    
    def get_current_unit(self):
        """Retorna a unidade atual baseada na sessão"""
        barbershop = self.get_barbershop()
        unit_id = self.request.session.get(f'current_unit_{barbershop.id}')
        
        if unit_id:
            try:
                return barbershop.units.get(id=unit_id, is_active=True)
            except Unit.DoesNotExist:
                pass
        
        # Retorna a primeira unidade ativa como padrão
        return barbershop.units.filter(is_active=True).first()
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        barbershop = self.get_barbershop()
        context['barbershop'] = barbershop
        context['current_unit'] = self.get_current_unit()
        context['available_units'] = barbershop.units.filter(is_active=True)
        return context

class BarbershopEmployeeLoginView(BarbershopMixin, View):
    """Login específico para funcionários da barbearia"""
    template_name = 'barbershop/login.html'
    
    def get(self, request, *args, **kwargs):
        # Se já estiver logado, redirecionar para dashboard
        if request.user.is_authenticated:
            barbershop = self.get_barbershop()
            if self.has_permission(request.user, barbershop):
                return redirect('barbershop:dashboard', slug=barbershop.slug)
        
        barbershop = self.get_barbershop()
        form = BarbershopEmployeeLoginForm(barbershop=barbershop)
        
        return render(request, self.template_name, {
            'form': form,
            'barbershop': barbershop
        })
    
    def post(self, request, *args, **kwargs):
        barbershop = self.get_barbershop()
        form = BarbershopEmployeeLoginForm(
            data=request.POST, 
            barbershop=barbershop
        )
        
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            
            # Definir unidade padrão na sessão
            try:
                if hasattr(user, 'employee_profile'):
                    unit = user.employee_profile.unit
                    request.session[f'current_unit_{barbershop.id}'] = unit.id
                else:
                    # É o dono - usar primeira unidade
                    first_unit = barbershop.units.filter(is_active=True).first()
                    if first_unit:
                        request.session[f'current_unit_{barbershop.id}'] = first_unit.id
            except:
                pass
            
            messages.success(request, f'Bem-vindo, {user.get_full_name()}!')
            return redirect('barbershop:dashboard', slug=barbershop.slug)
        
        return render(request, self.template_name, {
            'form': form,
            'barbershop': barbershop
        })
    
    def has_permission(self, user, barbershop):
        """Verifica se o usuário tem permissão para acessar a barbearia"""
        # É o dono?
        if barbershop.owner_user == user:
            return True
        
        # É funcionário?
        try:
            employee = user.employee_profile
            return employee.unit.barbershop == barbershop and employee.is_active
        except:
            return False

class BarbershopLandingView(BarbershopMixin, DetailView):
    """Landing page pública da barbearia"""
    model = Barbershop
    template_name = 'barbershop/landing.html'
    context_object_name = 'barbershop'
    slug_field = 'slug'
    slug_url_kwarg = 'slug'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        barbershop = self.object
        
        # Imagens para banner/galeria
        context['banner_images'] = barbershop.images.filter(
            is_banner=True, 
            active=True
        ).order_by('order')
        
        context['gallery_images'] = barbershop.images.filter(
            is_banner=False,
            active=True
        ).order_by('order')[:6]  # Máximo 6 na galeria
        
        # Unidades com horários
        context['units'] = barbershop.units.filter(
            is_active=True
        ).prefetch_related('work_days')
        
        return context

class BarbershopAdminDashboardView(LoginRequiredMixin, BarbershopMixin, View):
    """Dashboard administrativo da barbearia"""
    template_name = 'barbershop/admin/dashboard.html'
    
    def get(self, request, *args, **kwargs):
        barbershop = self.get_barbershop()
        
        # Verificar se o usuário tem permissão (dono ou funcionário)
        if not self.has_permission(request.user, barbershop):
            messages.error(request, 'Você não tem permissão para acessar esta barbearia.')
            return redirect('barbershop:login', slug=barbershop.slug)
        
        current_unit = self.get_current_unit()
        
        # Estatísticas básicas
        context = {
            'barbershop': barbershop,
            'current_unit': current_unit,
            'available_units': barbershop.units.filter(is_active=True),
            'employees': Employee.objects.filter(
                unit__barbershop=barbershop,
                is_active=True
            ).select_related('user', 'unit'),
            'total_employees': Employee.objects.filter(
                unit__barbershop=barbershop,
                is_active=True
            ).count(),
            'total_units': barbershop.units.filter(is_active=True).count(),
            'active_barbers': Employee.objects.filter(
                unit__barbershop=barbershop,
                role='barbeiro',
                is_active=True
            ).count(),
        }
        
        return render(request, self.template_name, context)
    
    def has_permission(self, user, barbershop):
        """Verifica se o usuário tem permissão para acessar a barbearia"""
        # É o dono?
        if barbershop.owner_user == user:
            return True
        
        # É funcionário?
        try:
            employee = user.employee_profile
            return employee.unit.barbershop == barbershop and employee.is_active
        except:
            return False

class BarbershopSettingsView(LoginRequiredMixin, BarbershopMixin, View):
    """Configurações da barbearia (Minha Barbearia)"""
    template_name = 'barbershop/admin/settings.html'
    
    def get(self, request, *args, **kwargs):
        barbershop = self.get_barbershop()
        
        # Só o dono pode acessar configurações
        if barbershop.owner_user != request.user:
            messages.error(request, 'Apenas o dono pode acessar as configurações.')
            return redirect('barbershop:dashboard', slug=barbershop.slug)
        
        context = self.get_context_data()
        context.update({
            'barbershop_form': BarbershopForm(instance=barbershop),
            'units': barbershop.units.all(),
        })
        
        return render(request, self.template_name, context)
    
    def post(self, request, *args, **kwargs):
        barbershop = self.get_barbershop()
        
        if barbershop.owner_user != request.user:
            messages.error(request, 'Apenas o dono pode editar as configurações.')
            return redirect('barbershop:dashboard', slug=barbershop.slug)
        
        form = BarbershopForm(request.POST, request.FILES, instance=barbershop)
        
        if form.is_valid():
            form.save()
            messages.success(request, 'Configurações atualizadas com sucesso!')
            return redirect('barbershop:settings', slug=barbershop.slug)
        
        context = self.get_context_data()
        context.update({
            'barbershop_form': form,
            'units': barbershop.units.all(),
        })
        
        return render(request, self.template_name, context)

class BarbershopWebsiteEditView(LoginRequiredMixin, BarbershopMixin, View):
    """Edição do site público da barbearia (Meu Website)"""
    template_name = 'barbershop/admin/website.html'
    
    def get(self, request, *args, **kwargs):
        barbershop = self.get_barbershop()
        
        # Só o dono pode editar o website
        if barbershop.owner_user != request.user:
            messages.error(request, 'Apenas o dono pode editar o website.')
            return redirect('barbershop:dashboard', slug=barbershop.slug)
        
        context = self.get_context_data()
        context.update({
            'barbershop_form': BarbershopForm(instance=barbershop),
            'image_formset': BarbershopImageFormSet(instance=barbershop),
            'banner_images': barbershop.images.filter(is_banner=True, active=True),
            'gallery_images': barbershop.images.filter(is_banner=False, active=True),
        })
        
        return render(request, self.template_name, context)
    
    def post(self, request, *args, **kwargs):
        barbershop = self.get_barbershop()
        
        if barbershop.owner_user != request.user:
            messages.error(request, 'Apenas o dono pode editar o website.')
            return redirect('barbershop:dashboard', slug=barbershop.slug)
        
        barbershop_form = BarbershopForm(request.POST, request.FILES, instance=barbershop)
        image_formset = BarbershopImageFormSet(request.POST, request.FILES, instance=barbershop)
        
        if barbershop_form.is_valid() and image_formset.is_valid():
            barbershop_form.save()
            image_formset.save()
            messages.success(request, 'Website atualizado com sucesso!')
            return redirect('barbershop:website', slug=barbershop.slug)
        
        context = self.get_context_data()
        context.update({
            'barbershop_form': barbershop_form,
            'image_formset': image_formset,
            'banner_images': barbershop.images.filter(is_banner=True, active=True),
            'gallery_images': barbershop.images.filter(is_banner=False, active=True),
        })
        
        return render(request, self.template_name, context)

class UnitManagementView(LoginRequiredMixin, BarbershopMixin, View):
    """Gerenciamento de unidades"""
    template_name = 'barbershop/admin/units.html'
    
    def get(self, request, *args, **kwargs):
        barbershop = self.get_barbershop()
        
        if barbershop.owner_user != request.user:
            messages.error(request, 'Apenas o dono pode gerenciar unidades.')
            return redirect('barbershop:dashboard', slug=barbershop.slug)
        
        context = self.get_context_data()
        context.update({
            'units': barbershop.units.all().prefetch_related('work_days'),
            'unit_form': UnitForm(),
        })
        
        return render(request, self.template_name, context)

class UnitCreateView(LoginRequiredMixin, BarbershopMixin, View):
    """Criar nova unidade"""
    
    def post(self, request, *args, **kwargs):
        barbershop = self.get_barbershop()
        
        if barbershop.owner_user != request.user:
            messages.error(request, 'Apenas o dono pode criar unidades.')
            return redirect('barbershop:dashboard', slug=barbershop.slug)
        
        form = UnitForm(request.POST)
        
        if form.is_valid():
            unit = form.save(commit=False)
            unit.barbershop = barbershop
            unit.save()
            messages.success(request, f'Unidade "{unit.name}" criada com sucesso!')
        else:
            messages.error(request, 'Erro ao criar unidade. Verifique os dados.')
        
        return redirect('barbershop:units', slug=barbershop.slug)

class EmployeeManagementView(LoginRequiredMixin, BarbershopMixin, View):
    """Gerenciamento de funcionários"""
    template_name = 'barbershop/admin/employees.html'
    
    def get(self, request, *args, **kwargs):
        barbershop = self.get_barbershop()
        
        # Só dono ou gerente pode gerenciar funcionários
        if not self.can_manage_employees(request.user, barbershop):
            messages.error(request, 'Você não tem permissão para gerenciar funcionários.')
            return redirect('barbershop:dashboard', slug=barbershop.slug)
        
        context = self.get_context_data()
        context.update({
            'employees': Employee.objects.filter(
                unit__barbershop=barbershop
            ).select_related('user', 'unit').order_by('user__first_name'),
            'employee_form': EmployeeForm(barbershop=barbershop),
        })
        
        return render(request, self.template_name, context)
    
    def can_manage_employees(self, user, barbershop):
        """Verifica se pode gerenciar funcionários"""
        if barbershop.owner_user == user:
            return True
        
        try:
            employee = user.employee_profile
            return (employee.unit.barbershop == barbershop and 
                   employee.role in ['gerente', 'dono'] and 
                   employee.is_active)
        except:
            return False

class EmployeeCreateView(LoginRequiredMixin, BarbershopMixin, View):
    """Criar novo funcionário"""
    
    def post(self, request, *args, **kwargs):
        barbershop = self.get_barbershop()
        
        # Verificação de permissão
        if barbershop.owner_user != request.user:
            messages.error(request, 'Apenas o dono pode adicionar funcionários.')
            return redirect('barbershop:employees', slug=barbershop.slug)
        
        form = EmployeeForm(request.POST, barbershop=barbershop)
        
        if form.is_valid():
            employee = form.save()
            messages.success(request, f'Funcionário "{employee.user.get_full_name()}" adicionado!')
        else:
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, f'{field}: {error}')
        
        return redirect('barbershop:employees', slug=barbershop.slug)

class EmployeeAvailabilityView(LoginRequiredMixin, BarbershopMixin, View):
    """Gerenciar disponibilidade dos barbeiros (página das imagens)"""
    template_name = 'barbershop/admin/availability.html'
    
    def get(self, request, *args, **kwargs):
        barbershop = self.get_barbershop()
        
        context = self.get_context_data()
        context.update({
            'barbers': Employee.objects.filter(
                unit__barbershop=barbershop,
                role='barbeiro',
                is_active=True
            ).select_related('user').prefetch_related('work_days'),
            'all_employees': Employee.objects.filter(
                unit__barbershop=barbershop,
                is_active=True
            ).select_related('user'),
            'absences': EmployeeAbsence.objects.filter(
                employee__unit__barbershop=barbershop
            ).select_related('employee__user').order_by('-date')[:10],
            'absence_form': EmployeeAbsenceForm(barbershop=barbershop),
        })
        
        return render(request, self.template_name, context)

class AbsenceCreateView(LoginRequiredMixin, BarbershopMixin, View):
    """Registrar ausência de funcionário"""
    
    def post(self, request, *args, **kwargs):
        barbershop = self.get_barbershop()
        
        form = EmployeeAbsenceForm(request.POST, barbershop=barbershop)
        
        if form.is_valid():
            absence = form.save(commit=False)
            absence.created_by = request.user
            absence.save()
            messages.success(request, 'Ausência registrada com sucesso!')
        else:
            messages.error(request, 'Erro ao registrar ausência.')
        
        return redirect('barbershop:availability', slug=barbershop.slug)

# Views para AJAX
@require_http_methods(["POST"])
@login_required
def set_current_unit(request, slug):
    """Definir unidade atual na sessão"""
    barbershop = get_object_or_404(Barbershop, slug=slug)
    
    try:
        data = json.loads(request.body)
        unit_id = data.get('unit_id')
        
        # Verificar se a unidade pertence à barbearia
        unit = barbershop.units.get(id=unit_id, is_active=True)
        
        # Salvar na sessão
        request.session[f'current_unit_{barbershop.id}'] = unit.id
        
        return JsonResponse({'success': True, 'unit_name': unit.name})
    
    except (json.JSONDecodeError, Unit.DoesNotExist, KeyError):
        return JsonResponse({'success': False, 'message': 'Unidade inválida'})

@require_http_methods(["POST"])
@login_required
def toggle_employee_status(request, slug, employee_id):
    """Ativar/desativar funcionário via AJAX"""
    barbershop = get_object_or_404(Barbershop, slug=slug)
    employee = get_object_or_404(Employee, id=employee_id, unit__barbershop=barbershop)
    
    # Verificar permissão
    if barbershop.owner_user != request.user:
        return JsonResponse({'success': False, 'message': 'Sem permissão'})
    
    employee.is_active = not employee.is_active
    employee.save()
    
    return JsonResponse({
        'success': True,
        'is_active': employee.is_active,
        'message': f'Funcionário {"ativado" if employee.is_active else "desativado"}'
    })

@require_http_methods(["GET"])
def barbershop_public_site(request, slug):
    """Site público da barbearia (/<slug>/web/)"""
    barbershop = get_object_or_404(Barbershop, slug=slug, is_active=True)
    
    context = {
        'barbershop': barbershop,
        'banner_images': barbershop.images.filter(is_banner=True, active=True).order_by('order'),
        'gallery_images': barbershop.images.filter(is_banner=False, active=True).order_by('order'),
        'units': barbershop.units.filter(is_active=True).prefetch_related('work_days'),
    }
    
    return render(request, 'barbershop/public/site.html', context)