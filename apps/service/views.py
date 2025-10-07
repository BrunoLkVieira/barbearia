# apps/services/views.py
from django.shortcuts import render

def ServiceView(request, barbershop_slug, unit_slug=None):
    # A view não faz absolutamente nada, apenas renderiza o template.
    # Os parâmetros são necessários para a URL funcionar.
    return render(request, "service/services.html")