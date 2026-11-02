"""
Unix Shop - Images FTP Upload

Uploads every image inside the local images/ folder to:
    public_html/images/

The FTP login must have permission to access public_html/images.
If cPanel has jailed the FTP account directly inside public_html/images,
change FTP_REMOTE_PATH to "/" instead. Do not leave it pointed at data/.

Folder structure is preserved, for example:
    local images/products/laptop.webp
    -> public_html/images/products/laptop.webp
"""

from __future__ import annotations

from ftplib import FTP, error_perm
from pathlib import Path, PurePosixPath


# ============================================================
# WEBSITE PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent
SOURCE_DIR = BASE_DIR / "images"


# ============================================================
# FTP CONFIGURATION
#
# Enter the FTP username and password below.
# This path explicitly targets the website's public_html/images folder.
# The FTP account must be able to access public_html from its FTP root.
# If the FTP account's home directory is already public_html/images,
# set FTP_REMOTE_PATH = "/" instead.
# ============================================================

FTP_HOST = "ftp.unix-shop.ir"
FTP_PORT = 21

FTP_USERNAME = "admin_image@unix-shop.ir"
FTP_PASSWORD = "^r827{H$s+B$;3kH"

# Explicit destination: the website image directory.
# This is intentionally NOT "/" because that means the FTP account's home.
FTP_REMOTE_PATH = "/"

# Skip remote images with the same file size. Set True to upload every image.
# Set True temporarily when you replace an image with different content
# but exactly the same file size.
FORCE_UPLOAD = False


# Supported image formats.
IMAGE_EXTENSIONS = {
    ".avif",
    ".bmp",
    ".gif",
    ".ico",
    ".jpeg",
    ".jpg",
    ".png",
    ".svg",
    ".webp",
}


# ============================================================
# VALIDATE LOCAL IMAGES
# ============================================================

def get_image_files():

    print("Checking local images folder...")

    if not SOURCE_DIR.exists():

        print()
        print("ERROR: images folder was not found:")
        print(SOURCE_DIR)
        print()
        print("Copy your existing images folder next to this script.")

        return None

    if not SOURCE_DIR.is_dir():

        print("ERROR: images path is not a folder:")
        print(SOURCE_DIR)

        return None

    image_files = sorted(
        path
        for path in SOURCE_DIR.rglob("*")
        if path.is_file()
        and path.suffix.lower() in IMAGE_EXTENSIONS
        and not any(part.startswith(".") for part in path.relative_to(SOURCE_DIR).parts)
    )

    if not image_files:

        print("ERROR: No supported image files were found in images/.")

        return None

    print(f"Found {len(image_files)} image(s).")

    return image_files


# ============================================================
# REMOTE DIRECTORY
# ============================================================

def change_to_remote_directory(ftp: FTP, relative_directory: PurePosixPath):

    # Start from the FTP account root for every image.
    ftp.cwd(FTP_REMOTE_PATH)

    for folder in relative_directory.parts:

        if folder in ("", "."):
            continue

        try:

            ftp.cwd(folder)

        except error_perm:

            # Create the directory if it does not exist.
            # If it already exists but cwd initially failed, the second
            # cwd below will report the actual FTP error.
            try:
                ftp.mkd(folder)
            except error_perm:
                pass

            ftp.cwd(folder)


# ============================================================
# FTP UPLOAD
# ============================================================

def upload_to_ftp(image_files):

    print()
    print("Connecting to website FTP...")

    ftp = FTP()
    uploaded_count = 0
    skipped_count = 0
    failed_files = []

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

        ftp.set_pasv(True)
        ftp.voidcmd("TYPE I")

        print("FTP connection successful.")

        # Verify the exact target folder before uploading anything.
        # If this fails, the FTP account cannot access public_html/images.
        ftp.cwd(FTP_REMOTE_PATH)
        actual_remote_path = ftp.pwd()

        print(f"FTP destination configured: {FTP_REMOTE_PATH}")
        print(f"FTP destination reached:    {actual_remote_path}")
        print()

        for index, image_file in enumerate(image_files, start=1):

            relative_path = image_file.relative_to(SOURCE_DIR)
            relative_directory = PurePosixPath(
                relative_path.parent.as_posix()
            )

            try:

                change_to_remote_directory(
                    ftp,
                    relative_directory
                )

                local_size = image_file.stat().st_size
                remote_size = None

                if not FORCE_UPLOAD:

                    try:
                        remote_size = ftp.size(image_file.name)
                    except Exception:
                        # The file does not exist yet, or this FTP server
                        # does not support SIZE. In either case, upload it.
                        remote_size = None

                if remote_size == local_size:

                    skipped_count += 1

                    print(
                        f"[{index}/{len(image_files)}] Skipped (same size): "
                        f"{relative_path.as_posix()}"
                    )

                    continue

                with image_file.open("rb") as file:

                    ftp.storbinary(
                        f"STOR {image_file.name}",
                        file
                    )

                uploaded_count += 1

                print(
                    f"[{index}/{len(image_files)}] Uploaded: "
                    f"{relative_path.as_posix()}"
                )

            except Exception as e:

                failed_files.append(
                    (relative_path.as_posix(), str(e))
                )

                print(
                    f"[{index}/{len(image_files)}] FAILED: "
                    f"{relative_path.as_posix()} - {e}"
                )

        print()
        print("==============================================")
        print(f"Uploaded: {uploaded_count}")
        print(f"Skipped:  {skipped_count} (already on host, same size)")
        print(f"Failed:   {len(failed_files)}")
        print("==============================================")

        return len(failed_files) == 0

    except Exception as e:

        print()
        print(f"FTP connection/upload failed: {e}")

        return False

    finally:

        try:
            ftp.quit()
        except Exception:
            try:
                ftp.close()
            except Exception:
                pass


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("==============================================")
    print(" Unix Shop - Images FTP Upload")
    print("==============================================")
    print()

    print(f"Source: {SOURCE_DIR}")
    print()

    if (
        FTP_USERNAME == "YOUR_IMAGES_FTP_USERNAME"
        or FTP_PASSWORD == "YOUR_IMAGES_FTP_PASSWORD"
        or not FTP_USERNAME.strip()
        or not FTP_PASSWORD
    ):

        print("ERROR: Set your images FTP username and password")
        print("at the top of upload-images.py before running it.")

        return

    image_files = get_image_files()

    if image_files is None:

        print()
        print("Upload cancelled.")

        return

    if upload_to_ftp(image_files):

        print()
        print("==============================================")
        print(" Images uploaded successfully.")
        print("==============================================")

    else:

        print()
        print("==============================================")
        print(" Image upload FAILED or completed with errors.")
        print("==============================================")


if __name__ == "__main__":
    main()
