import json
import calendar
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.db.models import Sum, Q, Min
from django.db.models.functions import TruncDay
from django.utils import timezone
from datetime import datetime, date

from apps.barbershop.models import Barbershop, Unit, Employee
from apps.scheduling.models import Appointment, AppointmentService
from apps.finance.models import UnitExpense

@login_required
def FinanceDashboardView(request, barbershop_slug, unit_slug=None):
    barbershop = get_object_or_404(Barbershop, slug=barbershop_slug)
    
    is_owner = (request.user == barbershop.owner_user)
    logged_employee = Employee.objects.filter(user=request.user, unit__barbershop=barbershop).first()
    is_admin = is_owner or (logged_employee and logged_employee.roles.filter(occupation__in=['gerente', 'caixa']).exists())
    
    unit = None
    if not is_admin:
        if not logged_employee: return redirect('user:login')
        unit = logged_employee.unit
        barber_filter = str(logged_employee.id)
    else:
        if unit_slug: unit = get_object_or_404(Unit, slug=unit_slug, barbershop=barbershop)
        barber_filter = request.GET.get('barber', '').strip()
        if barber_filter in ['None', 'todos', '']: barber_filter = ''

    # =========================================================================
    # AÇÕES: CRIAR, EDITAR, PAGAR E EXCLUIR DESPESAS
    # =========================================================================
    if request.method == "POST" and is_admin:
        action = request.POST.get("action")
        
        if action == "create_expense":
            nome_despesa = request.POST.get("name")
            try:
                valor_despesa = float(request.POST.get("amount", "0").replace(",", "."))
            except ValueError:
                valor_despesa = 0.00
                
            data_vencimento_str = request.POST.get("due_date")
            is_recurring = 'is_recurring' in request.POST
            is_paid = 'is_paid' in request.POST
            
            target_unit = unit or get_object_or_404(Unit, id=request.POST.get("unit_id"), barbershop=barbershop)
            data_base = datetime.strptime(data_vencimento_str, "%Y-%m-%d").date()

            if is_recurring:
                for i in range(12):
                    month = data_base.month + i
                    year = data_base.year + ((month - 1) // 12)
                    month = ((month - 1) % 12) + 1
                    day = min(data_base.day, calendar.monthrange(year, month)[1])
                    
                    data_projetada = date(year, month, day)
                    UnitExpense.objects.create(
                        unit=target_unit,
                        name=f"{nome_despesa} ({month:02d}/{year})",
                        amount=valor_despesa,
                        due_date=data_projetada,
                        is_recurring=True,
                        is_paid=is_paid if i == 0 else False
                    )
            else:
                UnitExpense.objects.create(
                    unit=target_unit, name=nome_despesa, amount=valor_despesa,
                    due_date=data_base, is_recurring=False, is_paid=is_paid
                )
            return redirect(request.get_full_path())
            
        elif action == "edit_expense":
            exp = get_object_or_404(UnitExpense, id=request.POST.get("expense_id"), unit__barbershop=barbershop)
            nome_despesa = request.POST.get("name")
            try:
                valor_despesa = float(request.POST.get("amount", "0").replace(",", "."))
            except ValueError:
                valor_despesa = 0.00
                
            nova_data = datetime.strptime(request.POST.get("due_date"), "%Y-%m-%d").date()
            is_paid = 'is_paid' in request.POST
            edit_future = request.POST.get("edit_future") == "true"
            
            base_name_old = exp.name.split(' (')[0] if exp.is_recurring else exp.name
            data_antiga = exp.due_date

            exp.name = f"{nome_despesa} ({nova_data.month:02d}/{nova_data.year})" if exp.is_recurring else nome_despesa
            exp.amount = valor_despesa
            exp.due_date = nova_data
            exp.is_paid = is_paid
            exp.save()
            
            if exp.is_recurring and edit_future:
                futuras = UnitExpense.objects.filter(
                    unit=exp.unit, name__startswith=base_name_old, amount=exp.amount,
                    due_date__gt=data_antiga, is_recurring=True, is_paid=False
                )
                for f_exp in futuras:
                    f_month, f_year = f_exp.due_date.month, f_exp.due_date.year
                    f_exp.name = f"{nome_despesa} ({f_month:02d}/{f_year})"
                    f_exp.amount = valor_despesa
                    f_exp.save()
                    
            return redirect(request.get_full_path())

        elif action == "pay_expense":
            exp = get_object_or_404(UnitExpense, id=request.POST.get("expense_id"), unit__barbershop=barbershop)
            exp.is_paid = True
            exp.save()
            return redirect(request.get_full_path())
            
        elif action == "delete_expense":
            exp = get_object_or_404(UnitExpense, id=request.POST.get("expense_id"), unit__barbershop=barbershop)
            delete_future = request.POST.get("delete_future") == "true"
            
            if exp.is_recurring and delete_future:
                base_name = exp.name.split(' (')[0]
                UnitExpense.objects.filter(
                    unit=exp.unit, name__startswith=base_name, amount=exp.amount,
                    due_date__gte=exp.due_date, is_paid=False
                ).delete()
            else:
                exp.delete()
            return redirect(request.get_full_path())

    # =========================================================================

    hoje = timezone.localtime().date()
    
    mes_str = request.GET.get('month')
    ano_str = request.GET.get('year')
    try:
        current_month = int(mes_str) if mes_str else hoje.month
        current_year = int(ano_str) if ano_str else hoje.year
    except ValueError:
        current_month, current_year = hoje.month, hoje.year

    start_date = date(current_year, current_month, 1)
    end_date = date(current_year, current_month, calendar.monthrange(current_year, current_month)[1])
        
    base_query = Q(unit__barbershop=barbershop, status='completed', date__range=[start_date, end_date])
    if unit: base_query &= Q(unit=unit)

    appointments = Appointment.objects.filter(base_query).select_related('employee', 'unit')
    
    employees_scope = Employee.objects.filter(unit__barbershop=barbershop, is_active=True).select_related('user')
    if unit and is_admin: employees_scope = employees_scope.filter(unit=unit)

    despesas_lista = []
    despesas_operacionais = 0.00
    if is_admin and not barber_filter:
        expense_query = Q(unit__barbershop=barbershop, due_date__range=[start_date, end_date])
        if unit: expense_query &= Q(unit=unit)
        despesas_lista = UnitExpense.objects.filter(expense_query).order_by('due_date')
        despesas_operacionais = float(despesas_lista.filter(is_paid=True).aggregate(total=Sum('amount'))['total'] or 0.00)

    # -----------------------------------------------------------------------------
    # ORM STRATEGY: ISOLAMENTO TOTAL (Visão de 1 Barbeiro vs Visão Global da Casa)
    # -----------------------------------------------------------------------------
    dados_dashboard = {}
    
    if barber_filter or not is_admin:
        # VISÃO INDIVIDUAL DO BARBEIRO
        emp_focado = employees_scope.filter(id=barber_filter if barber_filter else logged_employee.id).first()
        
        apps_barbeiro = appointments.filter(employee=emp_focado)
        total_vendas = apps_barbeiro.count()
        producao_bruta_barbeiro = float(apps_barbeiro.aggregate(total=Sum('total_price'))['total'] or 0.00)
        
        apps_services = AppointmentService.objects.filter(appointment__in=apps_barbeiro)
        comissoes_geradas = float(apps_services.aggregate(total=Sum('barber_commission_value'))['total'] or 0.00)

        contract_type = emp_focado.contract_type if hasattr(emp_focado, 'contract_type') else 'commission'

        if contract_type == 'chair_rental':
            aluguel = float(getattr(emp_focado, 'chair_rental_fee', 0.00) or 0.00)
            ganho_liquido = producao_bruta_barbeiro - aluguel
            dados_dashboard = {
                'card_1_label': "Minha Produção Bruta", 'card_1_val': producao_bruta_barbeiro,
                'card_2_label': "Comissões", 'card_2_val': 0.00,
                'card_3_label': "Custo Cadeira (Aluguel)", 'card_3_val': -aluguel, # Mostramos negativo para clareza
                'card_4_label': "Meu Ganho Líquido", 'card_4_val': ganho_liquido,
            }
        elif contract_type == 'fixed_salary':
            salario = float(getattr(emp_focado, 'fixed_salary', 0.00) or 0.00)
            ganho_liquido = comissoes_geradas + salario
            dados_dashboard = {
                'card_1_label': "Minha Produção Bruta", 'card_1_val': producao_bruta_barbeiro,
                'card_2_label': "Minhas Comissões", 'card_2_val': comissoes_geradas,
                'card_3_label': "Salário Fixo", 'card_3_val': salario,
                'card_4_label': "Meu Ganho Líquido", 'card_4_val': ganho_liquido,
            }
        else: # contract_type == 'commission'
            dados_dashboard = {
                'card_1_label': "Minha Produção Bruta", 'card_1_val': producao_bruta_barbeiro,
                'card_2_label': "Minhas Comissões", 'card_2_val': comissoes_geradas,
                'card_3_label': "Salário Fixo", 'card_3_val': 0.00,
                'card_4_label': "Meu Ganho Líquido", 'card_4_val': comissoes_geradas,
            }
            
        chart_appointments = apps_barbeiro
        
    else:
        # VISÃO GLOBAL (CAIXA DA BARBEARIA)
        total_vendas = appointments.count()
        producao_bruta_total = float(appointments.aggregate(total=Sum('total_price'))['total'] or 0.00)
        
        comissoes_geradas, salarios_fixos, aluguel_cadeiras_recebido = 0.00, 0.00, 0.00
        
        for emp in employees_scope:
            contract = emp.contract_type if hasattr(emp, 'contract_type') else 'commission'
            if contract == 'fixed_salary': 
                salarios_fixos += float(getattr(emp, 'fixed_salary', 0.00) or 0.00)
            elif contract == 'chair_rental': 
                aluguel_cadeiras_recebido += float(getattr(emp, 'chair_rental_fee', 0.00) or 0.00)
                
        apps_services = AppointmentService.objects.filter(appointment__in=appointments)
        comissoes_geradas = float(apps_services.aggregate(total=Sum('barber_commission_value'))['total'] or 0.00)
        
        faturamento_total_casa = producao_bruta_total + aluguel_cadeiras_recebido
        custo_folha_repasses = comissoes_geradas + salarios_fixos
        lucro_liquido_empresa = faturamento_total_casa - (custo_folha_repasses + despesas_operacionais)
        
        dados_dashboard = {
            'card_1_label': "Faturamento Bruto", 'card_1_val': faturamento_total_casa,
            'card_2_label': "Custos Folha/Comissão", 'card_2_val': custo_folha_repasses,
            'card_3_label': "Despesas Pagas", 'card_3_val': despesas_operacionais,
            'card_4_label': "Lucro Líquido Caixa", 'card_4_val': lucro_liquido_empresa,
        }
        
        chart_appointments = appointments

    # ================= Gráficos Dinâmicos =================
    revenue_qs = chart_appointments.annotate(day=TruncDay('date')).values('day').annotate(daily_total=Sum('total_price')).order_by('day')
    chart_revenue_dates = [item['day'].strftime('%d/%m') for item in revenue_qs if item['day']]
    chart_revenue_values = [float(item['daily_total']) for item in revenue_qs]

    chart_barber_names, chart_barber_commissions = [], []
    if is_admin and not barber_filter:
        for emp in employees_scope:
            if emp.user == barbershop.owner_user: continue
            soma_comissao = AppointmentService.objects.filter(appointment__in=appointments.filter(employee=emp)).aggregate(total=Sum('barber_commission_value'))['total'] or 0.00
            if soma_comissao > 0:
                chart_barber_names.append(emp.user.name)
                chart_barber_commissions.append(float(soma_comissao))
            
    top_services_qs = AppointmentService.objects.filter(appointment__in=chart_appointments).values('service__name').annotate(total_revenue=Sum('price_at_sale')).order_by('-total_revenue')[:5]
    
    meses_choices = [
        (1, 'Janeiro'), (2, 'Fevereiro'), (3, 'Março'), (4, 'Abril'),
        (5, 'Maio'), (6, 'Junho'), (7, 'Julho'), (8, 'Agosto'),
        (9, 'Setembro'), (10, 'Outubro'), (11, 'Novembro'), (12, 'Dezembro')
    ]
    
    anos_com_agendamentos = Appointment.objects.filter(unit__barbershop=barbershop).dates('date', 'year')
    anos_choices = sorted(list(set([d.year for d in anos_com_agendamentos] + [hoje.year])))

    context = {
        'barbershop': barbershop, 'unit': unit, 'units': barbershop.units.all() if is_admin else [unit],
        'is_owner': is_owner, 'is_admin': is_admin, 'employees': employees_scope, 'total_vendas': total_vendas,
        'current_month': current_month, 'current_year': current_year,
        'meses_choices': meses_choices, 'anos_choices': anos_choices, 'hoje_data': hoje.strftime("%Y-%m-%d"),
        'selected_barber': int(barber_filter) if barber_filter else '', 'active_tab': 'finance',
        'despesas_lista': despesas_lista,
    }
    context.update(dados_dashboard)
    context.update({
        'chart_revenue_dates': json.dumps(chart_revenue_dates), 'chart_revenue_values': json.dumps(chart_revenue_values),
        'chart_service_names': json.dumps([item['service__name'] for item in top_services_qs]), 
        'chart_service_values': json.dumps([float(item['total_revenue']) for item in top_services_qs]),
        'chart_category_data': json.dumps([dados_dashboard['card_1_val'], 0.00]),
    })
    return render(request, "finance/finance.html", context)