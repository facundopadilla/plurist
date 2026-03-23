from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class GenerationResult:
    success: bool
    provider_name: str
    model_id: str
    generated_text: str = ""
    template_variables: dict[str, Any] = field(default_factory=dict)
    latency_ms: int = 0
    token_count: int = 0
    cost_estimate: float = 0.0
    error_message: str = ""


class BaseProvider(ABC):
    """Abstract base interface for all generation providers."""

    @abstractmethod
    def generate(self, prompt: str, context: dict[str, Any]) -> GenerationResult:
        """Run generation and return a normalised GenerationResult."""
        ...
