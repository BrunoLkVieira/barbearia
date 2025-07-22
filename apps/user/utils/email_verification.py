from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator
from django.conf import settings
from django.utils.timezone import now

def send_verification_email(request, user):
    token = default_token_generator.make_token(user)
    uid = urlsafe_base64_encode(force_bytes(user.pk))

    verification_url = f"{settings.SITE_URL}/user/verify-email/{uid}/{token}/"

    # Renderiza o template HTML
    email_body = render_to_string('user/emails/verification_email.html', {
        'user': user,
        'activate_url': verification_url,
        'year': now().year
    })

    email = EmailMessage(
        'Confirme seu e-mail - OrblyCut',
        email_body,
        f'OrblyCut <{settings.DEFAULT_FROM_EMAIL}>',
        [user.email]
    )
    email.content_subtype = 'html'  # Define o conteúdo como HTML
    email.send()
