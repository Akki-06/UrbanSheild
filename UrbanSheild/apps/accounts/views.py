from rest_framework import generics, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import RegisterSerializer
from django.contrib.auth.models import User
import jwt
import requests


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer


class GoogleAuthViewSet(viewsets.ViewSet):
    """Handle Google OAuth authentication and user creation/login."""

    @action(detail=False, methods=["post"])
    def google_auth(self, request):
        """
        Handle Google OAuth token and create/login user.
        Expects: { "token": "<google_id_token>" }
        """
        token = request.data.get("token")

        if not token:
            return Response(
                {"error": "Token is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Verify token with Google using tokeninfo endpoint
            response = requests.get(
                f"https://www.googleapis.com/oauth2/v1/tokeninfo?id_token={token}"
            )

            if response.status_code != 200:
                return Response(
                    {"error": "Invalid token"},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            data = response.json()
            google_id = data.get("user_id")
            email = data.get("email")
            name = data.get("name", email.split("@")[0])

            if not google_id or not email:
                return Response(
                    {"error": "Invalid token data"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Try to get existing user or create new one
            from apps.accounts.models import UserProfile

            profile = UserProfile.objects.filter(google_id=google_id).first()

            if profile:
                # User exists, generate tokens
                user = profile.user
            else:
                # Create new user
                username = email.split("@")[0]
                counter = 1
                base_username = username

                # Handle duplicate usernames
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{counter}"
                    counter += 1

                user = User.objects.create_user(
                    username=username,
                    email=email,
                    first_name=name.split()[0] if name else "",
                    last_name=" ".join(name.split()[1:]) if len(name.split()) > 1 else ""
                )

                # Create profile with google_id
                profile = UserProfile.objects.create(
                    user=user,
                    google_id=google_id
                )

            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)

            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "username": user.username,
                }
            })

        except ValueError as e:
            return Response(
                {"error": "Token verification failed"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
