from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import RegisterView, GoogleAuthViewSet

router = DefaultRouter()
router.register(r'google-auth', GoogleAuthViewSet, basename='google-auth')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
] + router.urls
