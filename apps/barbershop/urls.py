from django.urls import path
from .views import UnitView

app_name = "barbershop"

urlpatterns = [
    path('<slug:barbershop_slug>/units/', UnitView, name='units'),
]
