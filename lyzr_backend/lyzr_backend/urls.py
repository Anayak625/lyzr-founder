from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

health_check_view = lambda r: JsonResponse({"status": "ok"})

urlpatterns = [
    path('', health_check_view), 
    path('health/', health_check_view),  
    path('admin/', admin.site.urls),
    path('api/v1/', include('core.urls')),
    path('api/v1/billing/', include('billing.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
