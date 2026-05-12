from django.urls import path
from . import views

app_name = 'client'

urlpatterns = [
    path('<slug:barbershop_slug>/clientes/', views.ClientListView, name='client_list'),
]