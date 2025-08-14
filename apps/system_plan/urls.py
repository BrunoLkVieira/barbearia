from django.urls import path
from . import views



app_name = 'system_plan' 

urlpatterns = [
    path("", views.landing_page, name="landing_page"),
]
