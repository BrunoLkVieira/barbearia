from django.urls import path
from .views import UnitView

app_name = "barbershop"

urlpatterns = [
    path('units/', UnitView, name='units'),
]
