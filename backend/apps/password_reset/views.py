from django.utils import timezone
from django.conf import settings
from django.core.mail import send_mail
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from datetime import timedelta
import random

from .models import OTPCode
from apps.accounts.models import User


def generate_otp():
    return f"{random.randint(0, 999999):06d}"


@api_view(["POST"])
@permission_classes([AllowAny])
def send_otp_view(request):
    email = request.data.get("email")

    if not email:
        return Response({"code": "EF002"}, status=400)  # Missing Email

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({"code": "EF001"}, status=400)  # Email not registered

    otp = generate_otp()
    expiry = timezone.now() + timedelta(minutes=5)

    OTPCode.objects.create(email=email, otp_code=otp, expiry_time=expiry)

    try:
        send_mail(
            "Your Verification Code",
            f"Your OTP is: {otp}\nValid for 5 minutes.",
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
        )
    except Exception:
        return Response({"code": "EA010"}, status=500)  # Email not sent

    return Response({"code": "IF001"}, status=200)  # OTP sent successfully


@api_view(["POST"])
@permission_classes([AllowAny])
def verify_otp_view(request):
    email = request.data.get("email")
    otp = request.data.get("otp")
    new_password = request.data.get("new_password")
    confirm_password = request.data.get("confirm_password")

    if not email or not otp:
        return Response({"code": "EF002"}, status=400)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({"code": "EF001"}, status=400)

    try:
        otp_obj = OTPCode.objects.get(email=email, otp_code=otp)
    except OTPCode.DoesNotExist:
        return Response({"code": "EF005"}, status=400)  # Invalid OTP

    # Check expiration
    if timezone.now() > otp_obj.expiry_time:
        return Response({"code": "EF004"}, status=400)  # OTP expired

    # Check password match
    if new_password != confirm_password:
        return Response({"code": "EF003"}, status=400)

    # Update password
    user.set_password(new_password)
    user.save()

    # Optional delete or mark used
    otp_obj.delete()

    return Response({"code": "IF002"}, status=200)  # Password reset success
