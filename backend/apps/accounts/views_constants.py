from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from apps.accounts.models import UserError, UserInformation, UserValidation
from apps.accounts.constants import DEFAULT_MESSAGES


class ConstantsAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        messages = {
            "ERRORS": {},
            "INFORMATION": {},
            "VALIDATIONS": {},
        }

        # ✅ Load from DB
        for row in UserError.objects.all():
            messages["ERRORS"][row.error_code] = row.error_message

        for row in UserInformation.objects.all():
            messages["INFORMATION"][row.information_code] = row.information_text

        for row in UserValidation.objects.all():
            messages["VALIDATIONS"][row.validation_code] = row.validation_message

        # ✅ Fill missing ones with DEFAULT_MESSAGES fallback
        for code, msg in DEFAULT_MESSAGES["ERRORS"].items():
            messages["ERRORS"].setdefault(code, msg)

        for code, msg in DEFAULT_MESSAGES["INFORMATION"].items():
            messages["INFORMATION"].setdefault(code, msg)

        for code, msg in DEFAULT_MESSAGES["VALIDATIONS"].items():
            messages["VALIDATIONS"].setdefault(code, msg)

        return Response(messages, status=200)


class SingleMessageAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, type, code):
        type = type.lower()
        code = code.upper()

        table_map = {
            "error": (UserError, "error_code", "error_message"),
            "validation": (UserValidation, "validation_code", "validation_message"),
            "information": (UserInformation, "information_code", "information_text"),
        }

        # ✅ Wrong type
        if type not in table_map:
            return Response({"message": ""}, status=200)

        Model, field_code, field_msg = table_map[type]

        # ✅ DB
        obj = Model.objects.filter(**{field_code: code}).first()
        if obj:
            return Response({"message": getattr(obj, field_msg)}, status=200)

        # ✅ fallback
        fallback_group = {
            "error": "ERRORS",
            "validation": "VALIDATIONS",
            "information": "INFORMATION",
        }[type]

        msg = DEFAULT_MESSAGES[fallback_group].get(code, "")
        return Response({"message": msg}, status=200)
