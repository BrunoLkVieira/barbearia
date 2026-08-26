import json
import calendar
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db.models import Sum, Q, Min, Max
from django.db.models.functions import TruncDay
from django.utils import timezone
from datetime import datetime, date

from apps import barbershop
from apps.barbershop.models import Barbershop, Unit, Employee
from apps.scheduling.models import Appointment, AppointmentService
from apps.finance.models import UnitExpense, PayrollSnapshot
from apps.scheduling.views import get_tenant_employee

@login_required
def FinanceDashboardView(request, barbershop_slug, unit_slug=None):
    barbershop = get_object_or_404(Barbershop, slug=barbershop_slug)
    logged_employee = Employee.objects.filter(user=request.user, unit__barbershop=barbershop).first()
    
    is_owner = (request.user == barbershop.owner_user)
    emp = get_tenant_employee(request.user, barbershop)

    is_manager = False
    is_cashier = False

    if emp:
        is_manager = emp.roles.filter(occupation__iexact='gerente').exists()
        is_cashier = emp.roles.filter(occupation__iexact='caixa').exists() and not is_manager

    is_admin = is_owner or is_manager

    if is_owner:
        available_units = barbershop.units.filter(is_active=True)
    else:
        available_units = [emp.unit] if emp else []

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
    # AÇÕES: DESPESAS E EDIÇÃO DE SNAPSHOT (RETROATIVOS)
    # =========================================================================
    if request.method == "POST" and is_admin:
        action = request.POST.get("action")
        
        if action == "edit_snapshot":
            snap_id = request.POST.get("snapshot_id")
            snap = get_object_or_404(PayrollSnapshot, id=snap_id, employee__unit__barbershop=barbershop)
            try:
                snap.contract_type = request.POST.get("contract_type")
                snap.fixed_salary = float(request.POST.get("salary", "0").replace(",", "."))
                snap.chair_rental_fee = float(request.POST.get("rental", "0").replace(",", "."))
                snap.save()
                messages.success(request, "Modelo de contrato e valores do mês atualizados com sucesso!")
            except ValueError:
                messages.error(request, "Erro ao formatar os valores numéricos.")
            return redirect(request.get_full_path())

        elif action == "create_expense":
            nome_despesa = request.POST.get("name")
            try: valor_despesa = float(request.POST.get("amount", "0").replace(",", "."))
            except ValueError: valor_despesa = 0.00
                
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
                    UnitExpense.objects.create(unit=target_unit, name=f"{nome_despesa} ({month:02d}/{year})", amount=valor_despesa, due_date=data_projetada, is_recurring=True, is_paid=is_paid if i == 0 else False)
            else:
                UnitExpense.objects.create(unit=target_unit, name=nome_despesa, amount=valor_despesa, due_date=data_base, is_recurring=False, is_paid=is_paid)
            messages.success(request, "Despesa lançada com sucesso!")
            return redirect(request.get_full_path())
            
        elif action == "edit_expense":
            exp = get_object_or_404(UnitExpense, id=request.POST.get("expense_id"), unit__barbershop=barbershop)
            nome_despesa = request.POST.get("name")
            try: valor_despesa = float(request.POST.get("amount", "0").replace(",", "."))
            except ValueError: valor_despesa = 0.00
                
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
                futuras = UnitExpense.objects.filter(unit=exp.unit, name__startswith=base_name_old, due_date__gt=data_antiga, is_recurring=True, is_paid=False)
                for f_exp in futuras:
                    f_month, f_year = f_exp.due_date.month, f_exp.due_date.year
                    f_exp.name = f"{nome_despesa} ({f_month:02d}/{f_year})"
                    f_exp.amount = valor_despesa
                    f_exp.save()
            messages.success(request, "Conta atualizada com sucesso!")
            return redirect(request.get_full_path())

        elif action == "pay_expense":
            exp = get_object_or_404(UnitExpense, id=request.POST.get("expense_id"), unit__barbershop=barbershop)
            exp.is_paid = True
            exp.save()
            messages.success(request, "Despesa liquidada!")
            return redirect(request.get_full_path())
            
        elif action == "delete_expense":
            exp = get_object_or_404(UnitExpense, id=request.POST.get("expense_id"), unit__barbershop=barbershop)
            delete_future = request.POST.get("delete_future") == "true"
            if exp.is_recurring and delete_future:
                base_name = exp.name.split(' (')[0]
                UnitExpense.objects.filter(unit=exp.unit, name__startswith=base_name, due_date__gte=exp.due_date, is_recurring=True, is_paid=False).delete()
            else:
                exp.delete()
            messages.success(request, "Registro excluído com sucesso!")
            return redirect(request.get_full_path())

    # =========================================================================
    # LÓGICA POWER BI E DADOS FINANCEIROS BLINDADOS
    # =========================================================================
    hoje = timezone.localtime().date()
    meses_choices = [(1, 'Jan'), (2, 'Fev'), (3, 'Mar'), (4, 'Abr'), (5, 'Mai'), (6, 'Jun'), (7, 'Jul'), (8, 'Ago'), (9, 'Set'), (10, 'Out'), (11, 'Nov'), (12, 'Dez')]
    
    try: selected_year = int(request.GET.get('year', hoje.year))
    except ValueError: selected_year = hoje.year

    if 'year' in request.GET:
        raw_months = request.GET.getlist('month')
        selected_months = [int(m) for m in raw_months if m.isdigit()]
        if not selected_months: selected_months = list(range(1, 13))
    else:
        selected_months = [hoje.month]
        
    months_diff = len(selected_months)
    if months_diff < 1: months_diff = 1

    if len(selected_months) == 12: period_display = f"Ano Completo ({selected_year})"
    elif len(selected_months) == 1: period_display = f"{dict(meses_choices).get(selected_months[0], '')} de {selected_year}"
    else: period_display = f"{len(selected_months)} meses selecionados ({selected_year})"

    base_query = Q(unit__barbershop=barbershop, status='completed', date__year=selected_year, date__month__in=selected_months)
    if unit: base_query &= Q(unit=unit)

    appointments = Appointment.objects.filter(base_query).select_related('employee', 'unit')
    
    if unit and is_admin:
        employees_scope = Employee.objects.filter(unit=unit).select_related('user').distinct().order_by('-is_active', 'user__name')
    elif is_admin:
        employees_scope = Employee.objects.filter(unit__barbershop=barbershop).select_related('user').distinct().order_by('-is_active', 'user__name')
    else:
        employees_scope = Employee.objects.filter(id=logged_employee.id)

    despesas_lista = []
    despesas_operacionais = 0.00
    if is_admin and not barber_filter:
        expense_query = Q(unit__barbershop=barbershop, due_date__year=selected_year, due_date__month__in=selected_months)
        if unit: expense_query &= Q(unit=unit)
        despesas_lista = UnitExpense.objects.filter(expense_query).order_by('due_date')
        despesas_operacionais = float(despesas_lista.filter(is_paid=True).aggregate(total=Sum('amount'))['total'] or 0.00)

    # -----------------------------------------------------------------------------
    # ORM STRATEGY & LAZY SNAPSHOT DE SALÁRIO E TIPO DE CONTRATO
    # -----------------------------------------------------------------------------
    dados_dashboard = {}
    
    can_edit_snapshot = False
    current_snapshot_id = None
    current_snap_salary = 0.00
    current_snap_rental = 0.00
    current_snap_contract = 'commission'
    
    if barber_filter or not is_admin:
        emp_focado = employees_scope.filter(id=barber_filter if barber_filter else logged_employee.id).first()
        if not emp_focado: emp_focado = logged_employee

        apps_barbeiro = appointments.filter(employee=emp_focado)
        total_vendas = apps_barbeiro.count()
        producao_bruta_barbeiro = float(apps_barbeiro.aggregate(total=Sum('total_price'))['total'] or 0.00)
        
        apps_services = AppointmentService.objects.filter(appointment__in=apps_barbeiro)
        comissoes_geradas = float(apps_services.aggregate(total=Sum('barber_commission_value'))['total'] or 0.00)

        primeiro_agendamento = Appointment.objects.filter(employee=emp_focado).aggregate(Min('date'))['date__min']
        ultimo_agendamento = Appointment.objects.filter(employee=emp_focado).aggregate(Max('date'))['date__max']
        
        salario_acumulado = 0.00
        aluguel_acumulado = 0.00
        active_contract_type = getattr(emp_focado, 'contract_type', 'commission')

        for m in selected_months:
            mes_data_inicio = date(selected_year, m, 1)
            is_valid = False
            
            if primeiro_agendamento:
                if mes_data_inicio.year > primeiro_agendamento.year or (mes_data_inicio.year == primeiro_agendamento.year and mes_data_inicio.month >= primeiro_agendamento.month):
                    is_valid = True
                if not emp_focado.is_active and ultimo_agendamento:
                    if mes_data_inicio.year > ultimo_agendamento.year or (mes_data_inicio.year == ultimo_agendamento.year and mes_data_inicio.month > ultimo_agendamento.month):
                        is_valid = False
            elif emp_focado.is_active:
                if selected_year == hoje.year and m <= hoje.month: 
                    is_valid = True
            
            if is_valid:
                is_past_month = (selected_year < hoje.year) or (selected_year == hoje.year and m < hoje.month)
                current_salary = getattr(emp_focado, 'fixed_salary', 0.00) or 0.00
                current_rental = getattr(emp_focado, 'chair_rental_fee', 0.00) or 0.00
                current_contract = getattr(emp_focado, 'contract_type', 'commission')

                snapshot, created = PayrollSnapshot.objects.get_or_create(
                    employee=emp_focado, month=m, year=selected_year,
                    defaults={
                        'fixed_salary': current_salary, 
                        'chair_rental_fee': current_rental,
                        'contract_type': current_contract
                    }
                )
                
                # Se for o mês corrente, sempre atualiza com o que está no cadastro atual do barbeiro
                if not is_past_month:
                    snapshot.fixed_salary = current_salary
                    snapshot.chair_rental_fee = current_rental
                    snapshot.contract_type = current_contract
                    snapshot.save()
                    
                # Habilita edição se filtramos exato 1 mês e 1 barbeiro
                if len(selected_months) == 1 and is_admin:
                    can_edit_snapshot = True
                    current_snapshot_id = snapshot.id
                    current_snap_salary = float(snapshot.fixed_salary)
                    current_snap_rental = float(snapshot.chair_rental_fee)
                    current_snap_contract = snapshot.contract_type or current_contract
                    
                salario_acumulado += float(snapshot.fixed_salary)
                aluguel_acumulado += float(snapshot.chair_rental_fee)
                active_contract_type = snapshot.contract_type or current_contract

        if active_contract_type == 'chair_rental':
            ganho_liquido = producao_bruta_barbeiro - aluguel_acumulado
            dados_dashboard = { 'card_1_label': "Minha Produção Bruta", 'card_1_val': producao_bruta_barbeiro, 'card_2_label': "Comissões", 'card_2_val': 0.00, 'card_3_label': "Custo Cadeira", 'card_3_val': -aluguel_acumulado, 'card_4_label': "Meu Ganho Líquido", 'card_4_val': ganho_liquido, }
        elif active_contract_type == 'fixed_salary':
            ganho_liquido = comissoes_geradas + salario_acumulado
            dados_dashboard = { 'card_1_label': "Minha Produção Bruta", 'card_1_val': producao_bruta_barbeiro, 'card_2_label': "Minhas Comissões", 'card_2_val': comissoes_geradas, 'card_3_label': "Salário Fixo", 'card_3_val': salario_acumulado, 'card_4_label': "Meu Ganho Líquido", 'card_4_val': ganho_liquido, }
        elif active_contract_type == 'fixed_only':
            dados_dashboard = { 'card_1_label': "Minha Produção Bruta", 'card_1_val': producao_bruta_barbeiro, 'card_2_label': "Comissões", 'card_2_val': 0.00, 'card_3_label': "Salário Fixo", 'card_3_val': salario_acumulado, 'card_4_label': "Meu Ganho Líquido", 'card_4_val': salario_acumulado, }
        else:
            dados_dashboard = { 'card_1_label': "Minha Produção Bruta", 'card_1_val': producao_bruta_barbeiro, 'card_2_label': "Minhas Comissões", 'card_2_val': comissoes_geradas, 'card_3_label': "Salário Fixo", 'card_3_val': 0.00, 'card_4_label': "Meu Ganho Líquido", 'card_4_val': comissoes_geradas, }
            
        chart_appointments = apps_barbeiro
        
    else:
        total_vendas = appointments.count()
        producao_bruta_total = float(appointments.aggregate(total=Sum('total_price'))['total'] or 0.00)
        
        comissoes_geradas = 0.00
        salarios_fixos = 0.00
        aluguel_cadeiras_recebido = 0.00
        
        for emp in employees_scope:
            emp_apps = appointments.filter(employee=emp)
            
            apps_services = AppointmentService.objects.filter(appointment__in=emp_apps)
            comissoes_geradas += float(apps_services.aggregate(total=Sum('barber_commission_value'))['total'] or 0.00)

            primeiro_agendamento = Appointment.objects.filter(employee=emp).aggregate(Min('date'))['date__min']
            ultimo_agendamento = Appointment.objects.filter(employee=emp).aggregate(Max('date'))['date__max']
            
            for m in selected_months:
                mes_data_inicio = date(selected_year, m, 1)
                is_valid = False
                
                if primeiro_agendamento:
                    if mes_data_inicio.year > primeiro_agendamento.year or (mes_data_inicio.year == primeiro_agendamento.year and mes_data_inicio.month >= primeiro_agendamento.month):
                        is_valid = True
                    if not emp.is_active and ultimo_agendamento:
                        if mes_data_inicio.year > ultimo_agendamento.year or (mes_data_inicio.year == ultimo_agendamento.year and mes_data_inicio.month > ultimo_agendamento.month):
                            is_valid = False
                elif emp.is_active:
                    if selected_year == hoje.year and m <= hoje.month: 
                        is_valid = True
                
                if is_valid:
                    is_past_month = (selected_year < hoje.year) or (selected_year == hoje.year and m < hoje.month)
                    current_salary = getattr(emp, 'fixed_salary', 0.00) or 0.00
                    current_rental = getattr(emp, 'chair_rental_fee', 0.00) or 0.00
                    current_contract = getattr(emp, 'contract_type', 'commission')

                    snapshot, created = PayrollSnapshot.objects.get_or_create(
                        employee=emp, month=m, year=selected_year,
                        defaults={
                            'fixed_salary': current_salary, 
                            'chair_rental_fee': current_rental,
                            'contract_type': current_contract
                        }
                    )
                    
                    if not is_past_month:
                        snapshot.fixed_salary = current_salary
                        snapshot.chair_rental_fee = current_rental
                        snapshot.contract_type = current_contract
                        snapshot.save()
                        
                    snap_contract = snapshot.contract_type or current_contract

                    if snap_contract in ['fixed_salary', 'fixed_only']: 
                        salarios_fixos += float(snapshot.fixed_salary)
                    elif snap_contract == 'chair_rental': 
                        aluguel_cadeiras_recebido += float(snapshot.chair_rental_fee)
                
        faturamento_total_casa = producao_bruta_total + aluguel_cadeiras_recebido
        custo_folha_repasses = comissoes_geradas + salarios_fixos
        lucro_liquido_empresa = faturamento_total_casa - (custo_folha_repasses + despesas_operacionais)
        
        dados_dashboard = { 'card_1_label': "Faturamento Bruto", 'card_1_val': faturamento_total_casa, 'card_2_label': "Custos Folha/Comissão", 'card_2_val': custo_folha_repasses, 'card_3_label': "Despesas Pagas", 'card_3_val': despesas_operacionais, 'card_4_label': "Lucro Líquido Caixa", 'card_4_val': lucro_liquido_empresa, }
        chart_appointments = appointments

    # ================= Gráficos Dinâmicos =================
    revenue_qs = chart_appointments.annotate(day=TruncDay('date')).values('day').annotate(daily_total=Sum('total_price')).order_by('day')
    chart_revenue_dates = [item['day'].strftime('%d/%m') for item in revenue_qs if item['day']]
    chart_revenue_values = [float(item['daily_total']) for item in revenue_qs]
    top_services_qs = AppointmentService.objects.filter(appointment__in=chart_appointments).values('service__name').annotate(total_revenue=Sum('price_at_sale')).order_by('-total_revenue')[:5]
    payment_qs = chart_appointments.exclude( Q(payment_type__isnull=True) | Q(payment_type__exact='')).values('payment_type').annotate(total=Sum('total_price')).order_by('-total')
    pm_map = {'cash': 'Dinheiro', 'card': 'Cartão', 'pix': 'PIX'}
    chart_payment_names, chart_payment_values = [], []
    for p in payment_qs:
        val = float(p['total'] or 0.0)
        if val > 0:
            pt = p['payment_type']
            chart_payment_names.append(pm_map.get(pt, 'Outros') if pt else 'Outros')
            chart_payment_values.append(val)

    chart_barber_names, chart_barber_revenues = [], []
    if is_admin and not barber_filter:
        barber_qs = chart_appointments.values('employee__user__name').annotate(total=Sum('total_price')).order_by('-total')
        for b in barber_qs:
            val = float(b['total'] or 0.0)
            if val > 0:
                chart_barber_names.append(b['employee__user__name'])
                chart_barber_revenues.append(val)

    anos_com_agendamentos = Appointment.objects.filter(unit__barbershop=barbershop).dates('date', 'year')
    anos_choices = sorted(list(set([d.year for d in anos_com_agendamentos] + [hoje.year])))

    context = {
        'barbershop': barbershop, 'unit': unit, 'units': available_units,
        'is_owner': is_owner, 'is_manager': is_manager, 'is_cashier': is_cashier,
        'is_admin': is_admin, 'employees': employees_scope, 'total_vendas': total_vendas,
        'selected_year': selected_year, 'selected_months': selected_months, 'period_display': period_display,
        'meses_choices': meses_choices, 'anos_choices': anos_choices, 'hoje_data': hoje.strftime("%Y-%m-%d"),
        'selected_barber': int(barber_filter) if barber_filter else '', 'active_tab': 'finance',
        'despesas_lista': despesas_lista,
        'can_edit_snapshot': can_edit_snapshot,
        'current_snapshot_id': current_snapshot_id,
        'current_snap_salary': current_snap_salary,
        'current_snap_rental': current_snap_rental,
        'current_snap_contract': current_snap_contract,
    }
    context.update(dados_dashboard)
    context.update({
        'chart_revenue_dates': json.dumps(chart_revenue_dates), 'chart_revenue_values': json.dumps(chart_revenue_values),
        'chart_service_names': json.dumps([item['service__name'] for item in top_services_qs]), 'chart_service_values': json.dumps([float(item['total_revenue']) for item in top_services_qs]),
        'chart_payment_names': json.dumps(chart_payment_names), 'chart_payment_values': json.dumps(chart_payment_values),
        'chart_barber_names': json.dumps(chart_barber_names), 'chart_barber_revenues': json.dumps(chart_barber_revenues),
    })
    return render(request, "finance/finance.html", context)