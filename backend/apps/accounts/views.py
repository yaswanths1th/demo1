from django.core.mail import send_mail
from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.decorators import api_view, permission_classes
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
import logging

from .models import (
    User, Department, Role,
    UserError, UserInformation, UserValidation
)
from .serializers import (
    RegisterSerializer, UserSerializer, DepartmentSerializer, RoleSerializer
)
from .constants import DEFAULT_MESSAGES

User = get_user_model()
logger = logging.getLogger(__name__)

# Registration
@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({"code": "IR001"}, status=201)
    return Response(serializer.errors, status=400)

# Login
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        try:
            data = super().validate(attrs)
        except Exception:
            # No token on invalid login; frontend shows EL001 from tables
            return {"code": "EL001"}

        user = self.user
        data.update({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_admin": user.is_staff or user.is_superuser,
        })
        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

# Profile
class ProfileAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data, status=200)

    def put(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"code": "IP001"}, status=200)
        return Response(serializer.errors, status=400)

# Admin: Users
class AdminUserListCreateAPIView(generics.ListCreateAPIView):
    queryset = User.objects.all().order_by("-id")
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]

    def create(self, request, *args, **kwargs):
        data = request.data.copy()

        if not data.get("department"):
            general = Department.objects.filter(
                department_name__iexact="General", is_active=True
            ).first()
            if general:
                data["department"] = general.id

        if not data.get("role") and data.get("department"):
            default_role = Role.objects.filter(
                role_name__iexact="User",
                department_id=data["department"],
                is_active=True,
            ).first()
            if default_role:
                data["role"] = default_role.id

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()
        user.set_password(request.data.get("password"))
        user.save()

        return Response({"code": "IR001", "id": user.id}, status=201)

class AdminUserUpdateDeleteAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        user.delete()
        return Response({"code": "ID001"}, status=200)

@api_view(["POST"])
@permission_classes([IsAdminUser])
def user_toggle_active(request, pk):
    try:
        user = User.objects.get(pk=pk)
        user.is_active = not user.is_active
        user.save()
        return Response({"code": "IP001"}, status=200)
    except User.DoesNotExist:
        return Response({"code": "GEN001"}, status=404)

# Admin stats
class AdminUserStatsAPIView(generics.GenericAPIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response({
            "total_users": User.objects.count(),
            "active_users": User.objects.filter(is_active=True).count(),
            "hold_users": User.objects.filter(is_active=False).count(),
        }, status=200)

# Departments
class DepartmentListCreateAPIView(generics.ListCreateAPIView):
    queryset = Department.objects.all().order_by("department_name")
    serializer_class = DepartmentSerializer

    def get_permissions(self):
        return [AllowAny()] if self.request.method == "GET" else [IsAdminUser()]

    def create(self, request, *args, **kwargs):
        name = (request.data.get("department_name") or "").strip()
        if not name:
            return Response({"department_name": "VA002"}, status=400)
        if Department.objects.filter(department_name__iexact=name).exists():
            return Response({"department_name": "EA003"}, status=400)

        Department.objects.create(
            department_name=name,
            is_active=request.data.get("is_active", True)
        )
        return Response({"code": "IG001"}, status=201)

class DepartmentRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAdminUser]

@api_view(["POST"])
@permission_classes([IsAdminUser])
def department_toggle_active(request, pk):
    try:
        dept = Department.objects.get(pk=pk)
        dept.is_active = not dept.is_active
        dept.save()
        return Response({"code": "IP001"}, status=200)
    except Department.DoesNotExist:
        return Response({"code": "GEN001"}, status=404)

# Roles
class RoleListCreateAPIView(generics.ListCreateAPIView):
    queryset = Role.objects.all().order_by("role_name")
    serializer_class = RoleSerializer

    def get_permissions(self):
        return [AllowAny()] if self.request.method == "GET" else [IsAdminUser()]

    def create(self, request, *args, **kwargs):
        name = (request.data.get("role_name") or "").strip()
        dept = request.data.get("department")
        if not name or not dept:
            return Response({"role_name": "VA002"}, status=400)
        if Role.objects.filter(role_name__iexact=name, department_id=dept).exists():
            return Response({"role_name": "ER003"}, status=400)

        Role.objects.create(
            role_name=name,
            department_id=dept,
            is_active=request.data.get("is_active", True)
        )
        return Response({"code": "IG001"}, status=201)

class RoleRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAdminUser]

@api_view(["POST"])
@permission_classes([IsAdminUser])
def role_toggle_active(request, pk):
    try:
        role = Role.objects.get(pk=pk)
        role.is_active = not role.is_active
        role.save()
        return Response({"code": "IP001"}, status=200)
    except Role.DoesNotExist:
        return Response({"code": "GEN001"}, status=404)

# Email
@api_view(['POST'])
@permission_classes([IsAdminUser])
def send_user_credentials(request):
    email = request.data.get("email")
    username = request.data.get("username")
    password = request.data.get("password")

    if not email or not username:
        return Response({"email": "VA002"}, status=400)

    message = f"""
Hello {username},

Your account has been created.

Username: {username}
Password: {password}

Login: http://localhost:5173/login
"""
    try:
        send_mail("Your Login Credentials", message, None, [email], fail_silently=False)
        return Response({"code": "IG001"}, status=200)
    except Exception:
        return Response({"code": "GEN002"}, status=500)

# -------- Canonical messages endpoint (DB + DEFAULTS merged) --------
@api_view(["GET"])
@permission_classes([AllowAny])
def get_messages(request):
    try:
        user_error = list(UserError.objects.values("error_code", "error_message"))
        user_validation = list(UserValidation.objects.values("validation_code", "validation_message"))
        user_information = list(UserInformation.objects.values("information_code", "information_text"))
    except Exception:
        user_error, user_validation, user_information = [], [], []

    existing_error = {e["error_code"] for e in user_error}
    for code, msg in DEFAULT_MESSAGES["ERRORS"].items():
        if code not in existing_error:
            user_error.append({"error_code": code, "error_message": msg})

    existing_validation = {v["validation_code"] for v in user_validation}
    for code, msg in DEFAULT_MESSAGES["VALIDATIONS"].items():
        if code not in existing_validation:
            user_validation.append({"validation_code": code, "validation_message": msg})

    existing_info = {i["information_code"] for i in user_information}
    for code, msg in DEFAULT_MESSAGES["INFORMATION"].items():
        if code not in existing_info:
            user_information.append({"information_code": code, "information_text": msg})

    return Response({
        "user_error": user_error,
        "user_validation": user_validation,
        "user_information": user_information,
    }, status=200)
# ✅ Username availability check
@api_view(['GET'])
@permission_classes([AllowAny])
def check_username(request):
    username = request.query_params.get("username", "").strip()
    if not username:
        return Response({"detail": "username query param required"}, status=status.HTTP_400_BAD_REQUEST)

    exists = User.objects.filter(username__iexact=username).exists()
    return Response({"exists": exists}, status=status.HTTP_200_OK)


# ✅ Email availability check
@api_view(['GET'])
@permission_classes([AllowAny])
def check_email(request):
    """
    Check if an email already exists in DB
    GET /api/auth/check-email/?email=example@gmail.com
    """
    email = request.query_params.get("email", "").strip()
    if not email:
        return Response({"detail": "email query param required"}, status=status.HTTP_400_BAD_REQUEST)
    exists = User.objects.filter(email__iexact=email).exists()
    return Response({"exists": exists}, status=status.HTTP_200_OK)
