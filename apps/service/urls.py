# apps/services/urls.py
from django.urls import path
from . import views

app_name = 'services'

urlpatterns = [
    # URLs para serviços, geral e por unidade, igual ao seu app 'barbershop'
    path('<slug:barbershop_slug>/servicos/', views.ServiceView, name='list_general'),
    path('<slug:barbershop_slug>/<slug:unit_slug>/servicos/', views.ServiceView, name='list_unit'),
]