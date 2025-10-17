from django.shortcuts import render
from django.core.mail import send_mail
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .forms import ErrorReportForm
import json

@csrf_exempt
def report_error(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            form = ErrorReportForm(data)
            
            if form.is_valid():
                email = form.cleaned_data["email"]
                message = form.cleaned_data["message"] or "O usuário não forneceu uma mensagem adicional."
                error_type = form.cleaned_data["error_type"]

                # Envia o email
                send_mail(
                    subject=f"Reportar Erro {error_type} - Sistema Barbearia",
                    message=f"Email do usuário: {email}\n\nMensagem:\n{message}\n\n---\nEste é um report automático do sistema.",
                    from_email=None,  # Usa DEFAULT_FROM_EMAIL das settings
                    recipient_list=["orblycode@gmail.com"],
                    fail_silently=False,
                )

                return JsonResponse({"status": "success", "message": "Reporte enviado com sucesso!"})
            else:
                return JsonResponse({
                    "status": "error", 
                    "errors": form.errors
                }, status=400)
                
        except json.JSONDecodeError:
            return JsonResponse({
                "status": "error", 
                "message": "Dados inválidos"
            }, status=400)
        except Exception as e:
            return JsonResponse({
                "status": "error", 
                "message": f"Erro interno: {str(e)}"
            }, status=500)

    return JsonResponse({
        "status": "error", 
        "message": "Método não permitido"
    }, status=405)

def error400(request, exception):
    return render(request, 'core/400.html', status=400)

def error403(request, exception):
    return render(request, 'core/403.html', status=403)

def error404(request, exception):
    return render(request, 'core/404.html', status=404)

def error500(request):
    return render(request, 'core/500.html', status=500)

def error503(request):
    return render(request, 'core/503.html', status=503)