from apps.accounts.constants import DEFAULT_MESSAGES
from apps.accounts.models import UserError, UserInformation, UserValidation


def _pack(msg_type: str, code: str, message: str):
    return {"type": msg_type, "code": code, "message": message}


def get_message(code: str):
    """
    Unified resolver:
    ✅ First prefer DB
    ✅ else fallback to constants
    ✅ else return human-readable default
    """
    if not code:
        return _pack("error", "GEN000", "Code not provided.")

    code = str(code).strip().upper()
    prefix = code[0]

    # Error
    if prefix == "E":
        row = UserError.objects.filter(error_code=code).values("error_message").first()
        if row:
            return _pack("error", code, row["error_message"])
        msg = DEFAULT_MESSAGES["ERRORS"].get(code, "Something went wrong.")
        return _pack("error", code, msg)

    # Information
    if prefix == "I":
        row = UserInformation.objects.filter(information_code=code).values("information_text").first()
        if row:
            return _pack("info", code, row["information_text"])
        msg = DEFAULT_MESSAGES["INFORMATION"].get(code, "Success.")
        return _pack("info", code, msg)

    # Validation
    if prefix == "V":
        row = UserValidation.objects.filter(validation_code=code).values("validation_message").first()
        if row:
            return _pack("validation", code, row["validation_message"])
        msg = DEFAULT_MESSAGES["VALIDATIONS"].get(code, "Invalid input.")
        return _pack("validation", code, msg)

    return _pack("error", "GEN001", "Something went wrong.")
