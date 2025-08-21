# configs/urls.py - ATUALIZADO

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('user/', include('apps.user.urls', namespace='user')),
    path("", include("apps.system_plan.urls",namespace='system_plan')),
    path("", include("apps.system_plan.urls",namespace='system_plan')),
     path("", include("apps.barbershop.urls",namespace='barbershop')),

]

# Servir arquivos de media em desenvolvimento
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)