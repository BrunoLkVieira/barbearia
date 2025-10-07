# apps/products/urls.py
from django.urls import path
from . import views

app_name = 'products'

urlpatterns = [
    # URL para a página de produtos de uma barbearia específica
    path('<slug:barbershop_slug>/produtos/', views.ProductView, name='list'),
]