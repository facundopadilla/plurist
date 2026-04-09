"""
MinIO/S3 storage helpers for the design bank.

Uses boto3 under the hood. Credentials and endpoint are read from Django settings:
  DESIGN_BANK_S3_ENDPOINT_URL  (e.g. http://minio:9000)
  DESIGN_BANK_S3_ACCESS_KEY
  DESIGN_BANK_S3_SECRET_KEY
  DESIGN_BANK_S3_BUCKET        (default: design-bank)
  DESIGN_BANK_S3_REGION        (default: us-east-1)
"""

import io
import uuid
from typing import IO

import boto3
from django.conf import settings


def _client():
    return boto3.client(
        "s3",
        endpoint_url=getattr(settings, "DESIGN_BANK_S3_ENDPOINT_URL", None),
        aws_access_key_id=getattr(settings, "DESIGN_BANK_S3_ACCESS_KEY", None),
        aws_secret_access_key=getattr(settings, "DESIGN_BANK_S3_SECRET_KEY", None),
        region_name=getattr(settings, "DESIGN_BANK_S3_REGION", "us-east-1"),
    )


def _bucket() -> str:
    return getattr(settings, "DESIGN_BANK_S3_BUCKET", "design-bank")


def generate_storage_key(original_filename: str) -> str:
    ext = ""
    if "." in original_filename:
        ext = f".{original_filename.rsplit('.', 1)[-1].lower()}"
    return f"design-bank/{uuid.uuid4().hex}{ext}"


def upload_file(file_obj: IO[bytes], storage_key: str, content_type: str = "application/octet-stream") -> str:
    """Upload a file-like object to S3/MinIO. Returns the storage_key."""
    client = _client()
    client.upload_fileobj(
        file_obj,
        _bucket(),
        storage_key,
        ExtraArgs={"ContentType": content_type},
    )
    return storage_key


def delete_file(storage_key: str) -> None:
    client = _client()
    client.delete_object(Bucket=_bucket(), Key=storage_key)


def download_file(storage_key: str) -> bytes:
    """Download an object from S3/MinIO and return raw bytes."""
    client = _client()
    buf = io.BytesIO()
    client.download_fileobj(_bucket(), storage_key, buf)
    return buf.getvalue()


def generate_presigned_url(storage_key: str, expires_in: int = 3600) -> str:
    """Generate a presigned download URL using the public MinIO endpoint.

    We create the boto3 client with the *public* endpoint URL so the generated
    URL is signed for the same hostname the browser will use.  Using the
    internal hostname (minio:9000) and rewriting it afterwards invalidates the
    HMAC because ``host`` is included in the signed headers.
    """
    public_url = getattr(settings, "DESIGN_BANK_S3_PUBLIC_URL", None)
    endpoint = public_url or getattr(settings, "DESIGN_BANK_S3_ENDPOINT_URL", None)
    client = boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=getattr(settings, "DESIGN_BANK_S3_ACCESS_KEY", None),
        aws_secret_access_key=getattr(settings, "DESIGN_BANK_S3_SECRET_KEY", None),
        region_name=getattr(settings, "DESIGN_BANK_S3_REGION", "us-east-1"),
    )
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": _bucket(), "Key": storage_key},
        ExpiresIn=expires_in,
    )
