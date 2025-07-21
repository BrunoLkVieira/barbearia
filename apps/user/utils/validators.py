import re
from django.core.exceptions import ValidationError

def validate_cpf(value):
    if not re.match(r'^\d{3}\.\d{3}\.\d{3}-\d{2}$', value):
        raise ValidationError('CPF deve estar no formato 000.000.000-00')