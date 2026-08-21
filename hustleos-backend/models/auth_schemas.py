import re

from pydantic import BaseModel, EmailStr, constr, validator

NAME_PATTERN = re.compile(r"^[A-Za-z][A-Za-z '\-]*$")


def _validate_password_strength(password: str) -> str:
    if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        raise ValueError("Password must contain at least one letter and one number")
    return password


class SignupRequest(BaseModel):
    name: constr(strip_whitespace=True, min_length=2, max_length=60)
    email: EmailStr
    password: constr(min_length=8, max_length=128)

    @validator("name")
    def name_format(cls, v):
        if not NAME_PATTERN.match(v):
            raise ValueError("Name may only contain letters, spaces, hyphens and apostrophes")
        return v

    @validator("password")
    def password_strength(cls, v):
        return _validate_password_strength(v)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthUser(BaseModel):
    id: str
    name: str
    email: str


class AuthResponse(BaseModel):
    token: str
    user: AuthUser
