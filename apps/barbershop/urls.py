from django.urls import path
from .views import UnitView, EmployeeView, WorkDayView

app_name = "barbershop"

urlpatterns = [
    path('<slug:barbershop_slug>/unidades/', UnitView, name='units'),
    path('<slug:barbershop_slug>/funcionarios/', EmployeeView, name='employee'),
    path('<slug:barbershop_slug>/funcionamento/', WorkDayView, name='workday'),
]
