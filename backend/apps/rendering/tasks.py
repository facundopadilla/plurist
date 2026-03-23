"""
Celery tasks for the Playwright render pipeline.
"""

import io
import logging

from celery import shared_task
from playwright.sync_api import sync_playwright

from apps.design_bank.storage import upload_file

logger = logging.getLogger(__name__)


def _get_job(render_job_id: int):
    from .models import RenderJob

    return RenderJob.objects.filter(pk=render_job_id).first()


def _build_html(template_key: str, variables: dict) -> str:
    """
    Build a self-contained HTML page from trusted template inputs.

    Only template_key selects the layout; no user-supplied HTML/CSS/JS is ever
    injected — all values are HTML-escaped before insertion.
    """
    from html import escape

    brand_name = escape(str(variables.get("brand_name", "")))
    slogan = escape(str((variables.get("slogans") or [""])[0]))
    colors = variables.get("colors") or {}
    primary = escape(str(colors.get("primary", "#000000")))
    secondary = escape(str(colors.get("secondary", "#ffffff")))
    accent = escape(str(colors.get("accent", "#0066cc")))

    if template_key == "social-post-minimal":
        body_style = f"background:{secondary};color:{primary};"
        content = f"""
        <div style="display:flex;flex-direction:column;align-items:center;
                    justify-content:center;height:100%;gap:24px;padding:60px;">
          <h1 style="font-size:72px;font-weight:300;letter-spacing:-2px;margin:0;">
            {brand_name}
          </h1>
          <p style="font-size:28px;font-weight:300;opacity:0.6;margin:0;">{slogan}</p>
        </div>
        """
    elif template_key == "social-post-bold":
        body_style = f"background:{primary};color:{secondary};"
        content = f"""
        <div style="display:flex;flex-direction:column;align-items:flex-start;
                    justify-content:flex-end;height:100%;padding:80px;">
          <h1 style="font-size:96px;font-weight:900;line-height:1;
                     text-transform:uppercase;margin:0;">{brand_name}</h1>
          <p style="font-size:32px;margin:24px 0 0;color:{accent};">{slogan}</p>
        </div>
        """
    else:
        # social-post-standard (default)
        body_style = f"background:{secondary};color:{primary};"
        content = f"""
        <div style="display:flex;flex-direction:column;align-items:center;
                    justify-content:center;height:100%;gap:32px;padding:80px;">
          <div style="width:120px;height:120px;background:{accent};
                      border-radius:50%;display:flex;align-items:center;
                      justify-content:center;">
            <span style="color:{secondary};font-size:48px;font-weight:700;">
              {brand_name[:1]}
            </span>
          </div>
          <h1 style="font-size:60px;font-weight:700;margin:0;">{brand_name}</h1>
          <p style="font-size:24px;opacity:0.7;margin:0;">{slogan}</p>
        </div>
        """

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    width: 1080px;
    height: 1080px;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    {body_style}
  }}
  .canvas {{ width: 1080px; height: 1080px; position: relative; }}
</style>
</head>
<body>
<div class="canvas">{content}</div>
</body>
</html>"""


@shared_task(bind=True, max_retries=2)
def render_template(self, render_job_id: int):
    """
    Load a RenderJob, check the cache by input_hash, render via Playwright if needed,
    store the PNG in MinIO, and update job status.
    """
    from .models import RenderJob

    job = _get_job(render_job_id)
    if job is None:
        logger.warning("render_template: job %s not found", render_job_id)
        return

    # Cache check: if another job with same hash is already completed, reuse it
    existing = (
        RenderJob.objects.filter(
            input_hash=job.input_hash,
            status=RenderJob.Status.COMPLETED,
        )
        .exclude(pk=job.pk)
        .first()
    )
    if existing and existing.output_storage_key:
        logger.info(
            "render_template: cache hit for job %s -> reuse from job %s",
            render_job_id,
            existing.pk,
        )
        job.status = RenderJob.Status.COMPLETED
        job.output_storage_key = existing.output_storage_key
        job.save(update_fields=["status", "output_storage_key", "updated_at"])
        return

    job.status = RenderJob.Status.RENDERING
    job.save(update_fields=["status", "updated_at"])

    try:
        html = _build_html(job.template_key, job.input_variables)

        with sync_playwright() as p:
            browser = p.chromium.launch()
            try:
                page = browser.new_page(
                    viewport={"width": 1080, "height": 1080},
                )
                page.set_content(html, wait_until="networkidle")
                png_bytes = page.screenshot(type="png", full_page=False)
            finally:
                browser.close()

        storage_key = f"renders/{job.input_hash}.png"

        upload_file(io.BytesIO(png_bytes), storage_key, "image/png")

        job.status = RenderJob.Status.COMPLETED
        job.output_storage_key = storage_key
        job.error_message = ""
        job.save(update_fields=["status", "output_storage_key", "error_message", "updated_at"])
        logger.info("render_template: completed job %s -> %s", render_job_id, storage_key)

    except Exception as exc:
        logger.exception("render_template: failed job %s: %s", render_job_id, exc)
        job.status = RenderJob.Status.FAILED
        job.error_message = str(exc)
        job.save(update_fields=["status", "error_message", "updated_at"])
        raise self.retry(exc=exc, countdown=30)
