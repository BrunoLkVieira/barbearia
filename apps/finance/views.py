import json
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.db.models import Sum, Q
from django.db.models.functions import TruncDay
from django.utils import timezone
from datetime import datetime, date

from apps.barbershop.models import Barbershop, Unit, Employee
from apps.scheduling.models import Appointment, AppointmentService
from apps.finance.models import UnitExpense

@login_required
def FinanceDashboardView(request, barbershop_slug, unit_slug=None):
    barbershop = get_object_or_404(Barbershop, slug=barbershop_slug)
    
    # 1. PERMISSÕES E ALÇADAS
    is_owner = (request.user == barbershop.owner_user)
    logged_employee = Employee.objects.filter(user=request.user, unit__barbershop=barbershop).first()
    
    is_admin = is_owner or (
        logged_employee and logged_employee.roles.filter(occupation__in=['gerente', 'caixa']).exists()
    )
    
    unit = None
    if not is_admin:
        if not logged_employee:
            return redirect('user:login')
        unit = logged_employee.unit
        barber_filter = str(logged_employee.id)
    else:
        if unit_slug:
            unit = get_object_or_404(Unit, slug=unit_slug, barbershop=barbershop)
        barber_filter = request.GET.get('barber', '').strip()
        if barber_filter in ['None', 'todos', '']:
            barber_filter = ''

    # =========================================================================
    # SALVANDO NOVA DESPESA (O Modal que faltava ksksks)
    # =========================================================================
    if request.method == "POST" and is_admin:
        action = request.POST.get("action")
        if action == "create_expense":
            nome_despesa = request.POST.get("name")
            valor_str = request.POST.get("amount", "0").replace(".", "").replace(",", ".")
            valor_despesa = float(valor_str) if valor_str else 0.00
            
            data_vencimento = request.POST.get("due_date")
            is_recurring = 'is_recurring' in request.POST
            is_paid = 'is_paid' in request.POST
            
            # Se não estiver em uma unidade específica, pega a selecionada no select do modal
            target_unit = unit
            if not target_unit:
                form_unit_id = request.POST.get("unit_id")
                target_unit = get_object_or_404(Unit, id=form_unit_id, barbershop=barbershop)

            UnitExpense.objects.create(
                unit=target_unit,
                name=nome_despesa,
                amount=valor_despesa,
                due_date=data_vencimento,
                is_recurring=is_recurring,
                is_paid=is_paid,
                expense_type='fixed' if is_recurring else 'variable'
            )
            # Redireciona mantendo os filtros de data na URL
            return redirect(request.get_full_path())

    # 2. FILTRO TEMPORAL
    hoje = timezone.localtime().date()
    date_start_str = request.GET.get('dateStart')
    date_end_str = request.GET.get('dateEnd')
    
    try:
        if date_start_str and date_end_str:
            start_date = datetime.strptime(date_start_str, "%Y-%m-%d").date()
            end_date = datetime.strptime(date_end_str, "%Y-%m-%d").date()
        else:
            start_date = date(hoje.year, hoje.month, 1)
            end_date = hoje
    except ValueError:
        start_date = date(hoje.year, hoje.month, 1)
        end_date = hoje
        
    # 3. QUERY BASE ORM
    base_query = Q(unit__barbershop=barbershop, status='completed', date__range=[start_date, end_date])
    if unit:
        base_query &= Q(unit=unit)
    if barber_filter:
        base_query &= Q(employee__id=barber_filter)

    appointments = Appointment.objects.filter(base_query).select_related('employee', 'unit')
    total_vendas = appointments.count()
    producao_bruta = float(appointments.aggregate(total=Sum('total_price'))['total'] or 0.00)

    # 4. PROCESSAMENTO FINANCEIRO DA EQUIPE
    comissoes_geradas = 0.00
    salarios_fixos = 0.00
    aluguel_cadeiras_recebido = 0.00
    
    employees_scope = Employee.objects.filter(unit__barbershop=barbershop, is_active=True).select_related('user')
    if unit and is_admin:
        employees_scope = employees_scope.filter(unit=unit)
    elif not is_admin:
        employees_scope = employees_scope.filter(id=logged_employee.id)

    for emp in Employee.objects.filter(unit__barbershop=barbershop):
        emp_app_ids = appointments.filter(employee=emp).values_list('id', flat=True)
        if emp_app_ids.exists():
            soma_comissao = AppointmentService.objects.filter(appointment_id__in=emp_app_ids).aggregate(
                total=Sum('barber_commission_value')
            )['total'] or 0.00
            
            if barber_filter and str(emp.id) == barber_filter:
                comissoes_geradas += float(soma_comissao)
            elif not barber_filter:
                comissoes_geradas += float(soma_comissao)

        if emp in employees_scope:
            if emp.contract_type == 'fixed_salary':
                salarios_fixos += float(emp.fixed_salary or 0.00)
            elif emp.contract_type == 'chair_rental':
                aluguel_cadeiras_recebido += float(emp.chair_rental_fee or 0.00)

    despesas_operacionais = 0.00
    if is_admin and not barber_filter:
        expense_query = Q(unit__barbershop=barbershop)
        if unit: 
            expense_query &= Q(unit=unit)
        despesas_operacionais = float(UnitExpense.objects.filter(expense_query).filter(
            Q(is_recurring=True) | Q(due_date__range=[start_date, end_date], is_paid=True)
        ).aggregate(total=Sum('amount'))['total'] or 0.00)

    # 5. ESTRUTURAÇÃO DOS CARDS
    dados_dashboard = {}
    if not is_admin or barber_filter:
        emp_focado = employees_scope.filter(id=barber_filter).first() if barber_filter else employees_scope.first()
        contract_type = emp_focado.contract_type if emp_focado else 'commission'
        
        if contract_type == 'chair_rental':
            ganho_liquido_barbeiro = producao_bruta - aluguel_cadeiras_recebido
            custo_retido_ou_pago = aluguel_cadeiras_recebido
            label_custo = "Custo Cadeira"
        else:
            ganho_liquido_barbeiro = comissoes_geradas + salarios_fixos
            custo_retido_ou_pago = comissoes_geradas
            label_custo = "Minhas Comissões"

        dados_dashboard = {
            'card_1_label': "Minha Produção Bruta",
            'card_1_val': producao_bruta,
            'card_2_label': label_custo,
            'card_2_val': custo_retido_ou_pago,
            'card_3_label': "Salário Fixo",
            'card_3_val': salarios_fixos,
            'card_4_label': "Meu Ganho Líquido",
            'card_4_val': ganho_liquido_barbeiro,
        }
    else:
        faturamento_total_casa = producao_bruta + aluguel_cadeiras_recebido
        custo_folha_repasses = comissoes_geradas + salarios_fixos
        lucro_liquido_empresa = faturamento_total_casa - (custo_folha_repasses + despesas_operacionais)
        
        dados_dashboard = {
            'card_1_label': "Faturamento Bruto",
            'card_1_val': faturamento_total_casa,
            'card_2_label': "Custos Folha/Comissão",
            'card_2_val': custo_folha_repasses,
            'card_3_label': "Custos Fixos / Despesas",
            'card_3_val': despesas_operacionais,
            'card_4_label': "Lucro Líquido",
            'card_4_val': lucro_liquido_empresa,
        }

    # 6. DADOS PARA OS GRÁFICOS
    revenue_qs = appointments.annotate(day=TruncDay('date')).values('day').annotate(daily_total=Sum('total_price')).order_by('day')
    chart_revenue_dates = [item['day'].strftime('%d/%m') for item in revenue_qs if item['day']]
    chart_revenue_values = [float(item['daily_total']) for item in revenue_qs]

    # NOVO: Gráfico 3 -> Top 5 Serviços que mais renderam dinheiro no período filtrado
    top_services_qs = AppointmentService.objects.filter(
        appointment__in=appointments
    ).values('service__name').annotate(
        total_revenue=Sum('price_at_sale')
    ).order_by('-total_revenue')[:5]
    
    chart_service_names = [item['service__name'] for item in top_services_qs]
    chart_service_values = [float(item['total_revenue']) for item in top_services_qs]

    graficos_data = {
        'chart_revenue_dates': json.dumps(chart_revenue_dates),
        'chart_revenue_values': json.dumps(chart_revenue_values),
        
        'chart_service_names': json.dumps(chart_service_names),
        'chart_service_values': json.dumps(chart_service_values),
        
        'chart_category_data': json.dumps([producao_bruta, 0.00]),
    }

    context = {
        'barbershop': barbershop,
        'unit': unit,
        'units': barbershop.units.all() if is_admin else [unit],
        'is_owner': is_owner,
        'is_admin': is_admin,
        'employees': employees_scope,
        'total_vendas': total_vendas,
        'start_date': start_date.strftime("%Y-%m-%d"),
        'end_date': end_date.strftime("%Y-%m-%d"),
        'selected_barber': int(barber_filter) if barber_filter else '',
        'active_tab': 'finance',
    }
    context.update(dados_dashboard)
    context.update(graficos_data)
    
    return render(request, "finance/finance.html", context)