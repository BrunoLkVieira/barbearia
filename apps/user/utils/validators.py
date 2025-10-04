import re
from django.core.exceptions import ValidationError
from django.core.validators import validate_email

def validate_cpf(value):
    if not re.match(r'^\d{3}\.\d{3}\.\d{3}-\d{2}$', value):
        raise ValidationError('CPF deve estar no formato 000.000.000-00')
    

def validate_user_data(data):
    """
    Recebe um dicionário com dados de usuário e retorna uma lista de erros.
    Se a lista estiver vazia, os dados são válidos.
    """
    errors = []
    cpf = data.get('cpf', '')
    name = data.get('name', '')
    last_name = data.get('last_name', '')
    email = data.get('email', '')

    # Validação do CPF
    cpf_digits = re.sub(r'\D', '', cpf)
    if len(cpf_digits) != 11:
        errors.append("CPF: Deve conter 11 dígitos.")
    elif cpf_digits == '0' * 11:
        errors.append("CPF: Número de CPF inválido.")

    # Validação do Nome e Sobrenome
    if not name or name.isdigit():
        errors.append("Nome: Não pode estar em branco ou ser apenas números.")
    if not last_name or last_name.isdigit():
        errors.append("Sobrenome: Não pode estar em branco ou ser apenas números.")

    # Validação do Email
    if not email:
        errors.append("Email: O campo de e-mail é obrigatório.")
    else:
        try:
            validate_email(email)
        except ValidationError:
            errors.append("Email: Formato de e-mail inválido.")

    return errors