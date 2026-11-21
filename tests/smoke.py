"""Smoke-test published GitHub Pages output with a real browser (no submissions)."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE_URL", "http://127.0.0.1:8080").rstrip("/")
ARTIFACTS = Path("artifacts")
ARTIFACTS.mkdir(exist_ok=True)

def check(page, width):
    errors = []
    page.on("pageerror", lambda exception: errors.append(str(exception)))
    page.goto(BASE + "/", wait_until="networkidle")
    page.locator("h1.hero__title").wait_for(state="visible")
    assert page.locator("#check").count() == 1
    assert page.locator("#kontakt").count() == 1
    assert page.locator("img.hero__avatar").evaluate(
        "img => img.complete && img.naturalWidth > 0"), "Avatar not loaded"
    if width <= 900:
        menu = page.locator("[data-nav-toggle]")
        menu.click()
        assert menu.get_attribute("aria-expanded") == "true"
        page.locator(".site-nav").get_by_role("link", name="Angebot").click()
        assert menu.get_attribute("aria-expanded") == "false"

    page.locator('input[name="ziel"][value="Muskelaufbau"]').check()
    page.locator('input[name="erfahrung"][value="Einsteiger"]').check()
    # The complaints question is voluntary: submit without selecting any health answer.
    page.locator('input[name="zeit"][value="2-mal"]').check()
    page.locator('input[name="ort"][value="im Studio"]').check()
    show = page.get_by_role("button", name="Erste Orientierung anzeigen")
    assert show.is_enabled(), "Quiz cannot submit after five answers"
    show.click()
    assert page.get_by_role("heading", name="Dein möglicher Einstieg").is_visible()
    assert page.locator("[data-quiz-steps] li").count() == 4
    assert not page.locator("[data-quiz-note]").is_visible()
    link = page.locator("[data-quiz-send]").get_attribute("href")
    assert "wa.me/" in link
    for answer in ("Muskelaufbau", "Einsteiger", "2-mal", "Studio"):
        assert answer.lower() not in link.lower(), "Answers leaked into WhatsApp link"
    assert not errors, f"JavaScript errors: {errors}"
    page.screenshot(path=str(ARTIFACTS / f"home-{width}.png"), full_page=True)
    page.goto(BASE + "/impressum.html")
    assert page.locator("main.legal h1").inner_text().strip() == "Impressum"
    page.goto(BASE + "/datenschutz.html")
    assert "Datenschutzerklärung" in page.locator("main.legal h1").inner_text().replace("\u00ad", "")
    assert not errors, f"JavaScript errors: {errors}"

with sync_playwright() as playwright:
    browser = playwright.chromium.launch()
    try:
        for width in (360, 390, 768, 1440):
            context = browser.new_context(
                viewport={"width": width, "height": 800}, reduced_motion="reduce")
            try:
                check(context.new_page(), width)
                print(f"PASS {width}px")
            finally:
                context.close()
    finally:
        browser.close()
