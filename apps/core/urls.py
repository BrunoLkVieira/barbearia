from django.urls import path
from . import views

urlpatterns = [
    path('report-error/', views.report_error, name='report_error')
]