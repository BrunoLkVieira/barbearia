# configs/urls.py - ATUALIZADO

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from django.conf.urls import handler404, handler500, handler400, handler403
from apps.core import views as core_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('apps.user.urls', namespace='user')),
    path("", include("apps.system_plan.urls",namespace='system_plan')),
    path('', include('apps.service.urls', namespace='services')),
    path("", include("apps.barbershop.urls",namespace='barbershop')),
    path('', include('apps.product.urls', namespace='products')),
    path('', include('apps.client.urls')),
    path('', include('apps.scheduling.urls')),
    path('', include('apps.core.urls')),
]

# Servir arquivos de media em desenvolvimento
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

handler400 = core_views.error400
handler403 = core_views.error403
handler404 = core_views.error404
handler500 = core_views.error500



