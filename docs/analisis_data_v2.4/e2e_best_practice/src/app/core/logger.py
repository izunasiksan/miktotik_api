# UPDATE 2.4 - E2E Best Practice Python Implementation
# This file defines a robust logging system with proper levels and formatting.

import logging
import sys

# Standard configuration for consistent logging across the system
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def setup_logger(name: str = "app", level: int = logging.INFO) -> logging.Logger:
    """
    Sets up a custom logger with standard formatting and handlers.
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)

    # Standard Output (Console)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(logging.Formatter(LOG_FORMAT, DATE_FORMAT))
    logger.addHandler(console_handler)

    # File Output (For persistent logs)
    file_handler = logging.FileHandler("app.log", encoding="utf-8")
    file_handler.setFormatter(logging.Formatter(LOG_FORMAT, DATE_FORMAT))
    logger.addHandler(file_handler)

    return logger


# Global instance for quick access
logger = setup_logger()
