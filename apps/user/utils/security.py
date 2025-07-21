from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

def check_password_strength(password):
    """Valida força da senha (mínimo 8 caracteres, letras e números)"""
    try:
        validate_password(password)
    except ValidationError as e:
        raise ValidationError(e.messages)