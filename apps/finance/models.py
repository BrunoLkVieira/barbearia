from django.db import models
from apps.barbershop.models import Unit, Employee

class UnitExpense(models.Model):
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name="expenses")
    name = models.CharField("Descrição da Despesa", max_length=255)
    amount = models.DecimalField("Valor da Despesa", max_digits=10, decimal_places=2)
    
    is_recurring = models.BooleanField(
        "Despesa Recorrente Mensal?", 
        default=False,
        help_text="Se marcado, esta despesa será contabilizada no caixa de todos os meses."
    )
    due_date = models.DateField(
        "Data de Vencimento/Ocorrência",
        help_text="Para recorrentes, usamos apenas o dia. Para únicas, usamos a data exata."
    )
    
    is_paid = models.BooleanField("Pago?", default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        tipo = "Recorrente" if self.is_recurring else "Única"
        return f"{self.name} ({tipo}) - R$ {self.amount}"

# NOVA TABELA PARA BLINDAR SALÁRIOS E ALUGUÉIS NO PASSADO
class PayrollSnapshot(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="payroll_snapshots")
    month = models.IntegerField("Mês")
    year = models.IntegerField("Ano")
    fixed_salary = models.DecimalField("Salário Fixo", max_digits=10, decimal_places=2, default=0.00)
    chair_rental_fee = models.DecimalField("Aluguel de Cadeira", max_digits=10, decimal_places=2, default=0.00)
    
    class Meta:
        unique_together = ('employee', 'month', 'year')
        verbose_name = "Snapshot de Folha"
        verbose_name_plural = "Snapshots de Folhas"

    def __str__(self):
        return f"Snapshot {self.month}/{self.year} - {self.employee.user.name}"