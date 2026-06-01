"""
Storage abstraction layer.

Uses Azure Blob Storage when AZURE_STORAGE_CONNECTION_STRING is set,
falls back to local filesystem otherwise (local dev / Docker with a volume).
"""
import io
import os
import shutil
import tempfile
from contextlib import contextmanager
from typing import BinaryIO, Generator


class LocalStorage:
    def __init__(self, base_dir: str) -> None:
        self.base_dir = base_dir
        os.makedirs(base_dir, exist_ok=True)

    def save(self, file_obj: BinaryIO, filename: str) -> None:
        with open(os.path.join(self.base_dir, filename), "wb") as dst:
            shutil.copyfileobj(file_obj, dst)

    def save_text(self, text: str, filename: str) -> None:
        with open(os.path.join(self.base_dir, filename), "w", encoding="utf-8") as f:
            f.write(text)

    def load_bytes(self, filename: str) -> bytes:
        with open(os.path.join(self.base_dir, filename), "rb") as f:
            return f.read()

    def load_text(self, filename: str) -> str:
        with open(os.path.join(self.base_dir, filename), "r", encoding="utf-8") as f:
            return f.read()

    def delete(self, filename: str) -> None:
        p = os.path.join(self.base_dir, filename)
        if os.path.exists(p):
            os.remove(p)

    def exists(self, filename: str) -> bool:
        return os.path.exists(os.path.join(self.base_dir, filename))

    def local_path(self, filename: str) -> str | None:
        p = os.path.join(self.base_dir, filename)
        return p if os.path.exists(p) else None

    @contextmanager
    def as_tempfile(self, filename: str) -> Generator[str, None, None]:
        """Yield a local filesystem path for the given file."""
        yield os.path.join(self.base_dir, filename)


class AzureBlobStorage:
    def __init__(self, connection_string: str, container: str) -> None:
        from azure.storage.blob import BlobServiceClient
        self._svc = BlobServiceClient.from_connection_string(connection_string)
        self._container = container
        try:
            self._svc.create_container(container)
        except Exception:
            pass  # container already exists

    def _blob(self, filename: str):
        return self._svc.get_blob_client(container=self._container, blob=filename)

    def save(self, file_obj: BinaryIO, filename: str) -> None:
        self._blob(filename).upload_blob(file_obj, overwrite=True)

    def save_text(self, text: str, filename: str) -> None:
        self._blob(filename).upload_blob(text.encode("utf-8"), overwrite=True)

    def load_bytes(self, filename: str) -> bytes:
        return self._blob(filename).download_blob().readall()

    def load_text(self, filename: str) -> str:
        return self.load_bytes(filename).decode("utf-8")

    def delete(self, filename: str) -> None:
        try:
            self._blob(filename).delete_blob()
        except Exception:
            pass

    def exists(self, filename: str) -> bool:
        return self._blob(filename).exists()

    def local_path(self, filename: str) -> str | None:
        return None  # no local path for blob storage

    @contextmanager
    def as_tempfile(self, filename: str) -> Generator[str, None, None]:
        """Download the blob to a temp file, yield its path, then clean up."""
        data = self.load_bytes(filename)
        suffix = "." + filename.rsplit(".", 1)[-1] if "." in filename else ""
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(data)
            tmp_path = tmp.name
        try:
            yield tmp_path
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)


def get_storage() -> LocalStorage | AzureBlobStorage:
    from src.core.config import settings
    conn = getattr(settings, "AZURE_STORAGE_CONNECTION_STRING", None)
    if conn:
        container = getattr(settings, "AZURE_STORAGE_CONTAINER", "documents")
        return AzureBlobStorage(conn, container)
    return LocalStorage(settings.UPLOAD_DIR)


# Module-level singleton — imported by routers and services
storage = get_storage()
