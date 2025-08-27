from django.urls import path
from .views import UnitView, EmployeeView

app_name = "barbershop"

urlpatterns = [
    path('<slug:barbershop_slug>/unidades/', UnitView, name='units'),
    path('<slug:barbershop_slug>/funcionarios/', EmployeeView, name='employee'),
]
