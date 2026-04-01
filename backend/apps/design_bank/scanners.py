"""
Pluggable virus/malware scan interface.

MVP implementation: no-op scanner that always reports clean.
Future implementations can subclass BaseScannerBackend and configure
DESIGN_BANK_SCANNER_BACKEND in settings.
"""


class ScanResult:
    def __init__(self, clean: bool, detail: str = ""):
        self.clean = clean
        self.detail = detail

    def __bool__(self):
        return self.clean


class BaseScannerBackend:
    def scan_bytes(self, data: bytes, filename: str = "") -> ScanResult:
        raise NotImplementedError


class NoOpScanner(BaseScannerBackend):
    """MVP no-op scanner — passes everything as clean."""

    def scan_bytes(self, data: bytes, filename: str = "") -> ScanResult:
        return ScanResult(clean=True, detail="no-op scanner: skipped")


def get_scanner() -> BaseScannerBackend:
    """Return the configured scanner backend (defaults to NoOpScanner)."""
    from django.conf import settings

    backend_path = getattr(settings, "DESIGN_BANK_SCANNER_BACKEND", None)
    if not backend_path:
        return NoOpScanner()

    module_path, class_name = backend_path.rsplit(".", 1)
    import importlib

    module = importlib.import_module(module_path)  # nosec B108 -- value comes from Django settings (operator-controlled), not user input
    cls = getattr(module, class_name)
    return cls()
