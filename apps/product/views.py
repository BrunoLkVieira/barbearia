# apps/products/views.py
from django.shortcuts import render

def ProductView(request, barbershop_slug):
    # A view não faz absolutamente nada, apenas renderiza o template.
    # Os parâmetros (request, barbershop_slug) são necessários para a URL funcionar.
    return render(request, "product/product.html")