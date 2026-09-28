"""
Unix Shop - Product Specifications FTP Upload

Copies the local Spec Manager JSON and uploads it
to the website /data/ folder on cPanel FTP.
"""

from __future__ import annotations

import json
from ftplib import FTP
from pathlib import Path


# ============================================================
# WEBSITE PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

SOURCE_FILE = (
    BASE_DIR
    / "data"
    / "product-specs.json"
)


# ============================================================
# FTP CONFIGURATION
# ============================================================

FTP_HOST = "ftp.unix-shop.ir"
FTP_PORT = 21

FTP_USERNAME = "admin@unix-shop.ir"
FTP_PASSWORD = "9$@cl%Hx.OFgvoTg"

# The FTP account is restricted to the website data folder.
FTP_REMOTE_PATH = "/"


# ============================================================
# VALIDATE JSON
# ============================================================

def validate_specs_file():

    print("Checking product-specs.json...")

    if not SOURCE_FILE.exists():

        print()
        print(
            "ERROR: product-specs.json was not found:"
        )
        print(SOURCE_FILE)

        return False

    try:

        with SOURCE_FILE.open(
            "r",
            encoding="utf-8"
        ) as file:

            data = json.load(file)

        if not isinstance(data, dict):

            print(
                "ERROR: product-specs.json must contain an object."
            )

            return False

        if not isinstance(
            data.get("products"),
            dict
        ):

            print(
                "ERROR: product-specs.json has an invalid "
                "'products' structure."
            )

            return False

        product_count = len(
            data["products"]
        )

        print(
            f"Valid JSON found: {product_count} products"
        )

        return True

    except json.JSONDecodeError as e:

        print(
            f"ERROR: Invalid JSON: {e}"
        )

        return False

    except Exception as e:

        print(
            f"ERROR: Could not read JSON: {e}"
        )

        return False


# ============================================================
# FTP UPLOAD
# ============================================================

def upload_to_ftp():

    print()
    print("Connecting to website FTP...")

    ftp = FTP()

    try:

        ftp.connect(
            FTP_HOST,
            FTP_PORT,
            timeout=30
        )

        ftp.login(
            FTP_USERNAME,
            FTP_PASSWORD
        )

        print("FTP connection successful.")

        if FTP_REMOTE_PATH:

            ftp.cwd(
                FTP_REMOTE_PATH
            )

        with SOURCE_FILE.open(
            "rb"
        ) as file:

            ftp.storbinary(
                "STOR product-specs.json",
                file
            )

        print()
        print(
            "Upload successful:"
        )

        print(
            "product-specs.json"
        )

        return True

    except Exception as e:

        print()
        print(
            f"FTP upload failed: {e}"
        )

        return False

    finally:

        try:
            ftp.quit()

        except Exception:
            pass


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("==============================================")
    print(" Unix Shop - Product Specifications Upload")
    print("==============================================")
    print()

    print(
        f"Source: {SOURCE_FILE}"
    )

    print()

    if not validate_specs_file():

        print()
        print(
            "Upload cancelled."
        )

        return

    if upload_to_ftp():

        print()
        print("==============================================")
        print(" Product specifications uploaded successfully.")
        print("==============================================")

    else:

        print()
        print("==============================================")
        print(" Product specifications upload FAILED.")
        print("==============================================")


if __name__ == "__main__":
    main()