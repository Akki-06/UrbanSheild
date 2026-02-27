from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.shelters.views import ShelterViewSet
from apps.disasters.views import DisasterViewSet
from apps.authorities.views import AuthorityViewSet
from apps.traffic.views import TrafficIncidentViewSet

router = DefaultRouter()

router.register(r'shelters', ShelterViewSet)
router.register(r'disasters', DisasterViewSet)
router.register(r'authorities', AuthorityViewSet)
router.register(r'traffic', TrafficIncidentViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
]