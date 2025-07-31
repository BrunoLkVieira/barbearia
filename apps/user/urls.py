from django.urls import path
from .views import (
    UserRegisterView,
    UserLoginView,
    UserLogoutView,
    VerifyEmailView,
    HomeView
)

app_name = 'user'

urlpatterns = [
    path('register/', UserRegisterView.as_view(), name='register'),
    path('login/', UserLoginView.as_view(), name='login'),
    path('logout/', UserLogoutView.as_view(), name='logout'),
    path('home/', HomeView.as_view(), name='home'  ),
    path('verify-email/<str:uidb64>/<str:token>/', 
         VerifyEmailView.as_view(), 
         name='verify_email'),
    
]