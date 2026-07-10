from django.db import models
from apps.barbershop.models import Unit

class UnitExpense(models.Model):
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name="expenses")
    name = models.CharField("Descrição da Despesa", max_length=255)
    amount = models.DecimalField("Valor da Despesa", max_digits=10, decimal_places=2)
    
    # --- A INTELIGÊNCIA DO MVP ---
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