# UPDATE 2.4 - E2E Best Practice Python Implementation
# This file provides a centralized exception handling mechanism.

import logging

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.schemas.base import ApiResponse, ErrorDetail

logger = logging.getLogger(__name__)


class AppError(Exception):
    """
    Base exception class for all application errors.
    """

    def __init__(
        self, message: str, code: str = "INTERNAL_ERROR", status_code: int = 500
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)


class ResourceNotFoundError(AppError):
    """
    Exception raised when a requested resource is not found.
    """

    def __init__(self, message: str = "Resource not found"):
        super().__init__(
            message, code="NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND
        )


class ValidationError(AppError):
    """
    Exception raised when validation fails.
    """

    def __init__(self, message: str = "Validation failed"):
        super().__init__(
            message, code="VALIDATION_ERROR", status_code=status.HTTP_400_BAD_REQUEST
        )


def setup_exception_handlers(app: FastAPI):
    """
    Registers global exception handlers for the FastAPI app.
    """

    @app.exception_handler(AppError)
    async def app_exception_handler(request: Request, exc: AppError):
        logger.error(f"Application error: {exc.message} (code: {exc.code})")
        return JSONResponse(
            status_code=exc.status_code,
            content=ApiResponse(
                status="error",
                message=exc.message,
                errors=[ErrorDetail(code=exc.code, message=exc.message)],
            ).model_dump(by_alias=True),
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        logger.exception("Unexpected error occurred")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ApiResponse(
                status="error",
                message="An unexpected error occurred. Please try again later.",
                errors=[ErrorDetail(code="INTERNAL_ERROR", message=str(exc))],
            ).model_dump(by_alias=True),
        )
