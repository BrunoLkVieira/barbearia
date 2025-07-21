from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator
from django.conf import settings

def send_verification_email(request, user):
    token = default_token_generator.make_token(user)
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    
    verification_url = f"{settings.SITE_URL}/user/verify-email/{uid}/{token}/"
    
    subject = "Confirme seu e-mail"
    message = f"Clique no link para verificar: {verification_url}"
    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email])