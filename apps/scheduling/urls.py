from django.urls import path
from . import views

app_name = 'scheduling'

urlpatterns = [
    # Rota para a agenda da barbearia
    path('<slug:barbershop_slug>/agenda/', views.SchedulingView, name='agenda'),
]